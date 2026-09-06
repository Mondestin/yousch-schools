<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DocumentKind;
use App\Enums\IssuedDocumentStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\IssuedDocument;
use App\Models\Student;
use App\Models\User;
use App\Support\Documents\DocumentAuthenticity;
use App\Support\Documents\IssuedDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class IssuedDocumentController extends Controller
{
    use EnsuresStaffAbility;

    public function __construct(private IssuedDocumentService $issuedDocuments) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $validated = $request->validate([
            'studentId' => ['nullable', 'string', 'exists:students,id'],
            'kind' => ['nullable', 'string', Rule::in(DocumentKind::issuableValues())],
            'status' => ['nullable', 'string', Rule::enum(IssuedDocumentStatus::class)],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $query = IssuedDocument::query()
            ->with(['student', 'academicYear'])
            ->orderByDesc('issued_on')
            ->orderByDesc('created_at');

        if (! empty($validated['studentId'])) {
            $query->where('student_id', $validated['studentId']);
        }

        if (! empty($validated['kind'])) {
            $query->where('kind', $validated['kind']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['q'])) {
            $needle = '%'.$validated['q'].'%';
            $query->where(function ($builder) use ($needle): void {
                $builder
                    ->where('number', 'like', $needle)
                    ->orWhere('title', 'like', $needle)
                    ->orWhereHas('student', function ($studentQuery) use ($needle): void {
                        $studentQuery
                            ->where('matricule', 'like', $needle)
                            ->orWhere('first_name', 'like', $needle)
                            ->orWhere('last_name', 'like', $needle);
                    });
            });
        }

        return response()->json([
            'data' => $query->limit(200)->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $validated = $request->validate([
            'studentId' => ['required', 'string', 'exists:students,id'],
            'kind' => ['required', 'string', Rule::in(DocumentKind::issuableValues())],
            'academicYearId' => ['nullable', 'string', 'exists:academic_years,id'],
        ], [
            'studentId.required' => 'L’élève est obligatoire.',
            'kind.required' => 'Le type de document est obligatoire.',
            'kind.in' => 'Type de document non pris en charge.',
        ]);

        Student::query()->findOrFail($validated['studentId']);

        try {
            $document = $this->issuedDocuments->issue(
                $validated['studentId'],
                DocumentKind::from($validated['kind']),
                $validated['academicYearId'] ?? null,
                $user,
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $verifyUrl = DocumentAuthenticity::url([
            'type' => $document->kind,
            'studentId' => $document->student_id,
            'refId' => $document->id,
            'academicYearId' => $document->academic_year_id,
            'issuedOn' => $document->issued_on->toDateString(),
        ]);

        return response()->json([
            'data' => [
                ...$document->toApiArray(),
                'verifyUrl' => $verifyUrl,
            ],
        ], 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $validated = $request->validate([
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'kind' => ['required', 'string', Rule::in(DocumentKind::issuableValues())],
            'academicYearId' => ['nullable', 'string', 'exists:academic_years,id'],
        ], [
            'classroomId.required' => 'La classe est obligatoire.',
            'kind.required' => 'Le type de document est obligatoire.',
            'kind.in' => 'Type de document non pris en charge.',
        ]);

        $result = $this->issuedDocuments->bulkIssue(
            $validated['classroomId'],
            DocumentKind::from($validated['kind']),
            $validated['academicYearId'] ?? null,
            $user,
        );

        if ($result['createdCount'] === 0 && $result['failedCount'] === 0) {
            return response()->json([
                'message' => 'Aucun élève inscrit dans cette classe pour l’année choisie.',
                'data' => $result,
            ], 422);
        }

        return response()->json(['data' => $result], 201);
    }

    public function show(Request $request, string $issuedDocument): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $document = IssuedDocument::query()
            ->with(['student', 'academicYear'])
            ->findOrFail($issuedDocument);

        $verifyUrl = DocumentAuthenticity::url([
            'type' => $document->kind,
            'studentId' => $document->student_id,
            'refId' => $document->id,
            'academicYearId' => $document->academic_year_id,
            'issuedOn' => $document->issued_on->toDateString(),
        ]);

        return response()->json([
            'data' => [
                ...$document->toApiArray(),
                'verifyUrl' => $verifyUrl,
            ],
        ]);
    }

    public function revoke(Request $request, string $issuedDocument): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $document = IssuedDocument::query()
            ->with(['student', 'academicYear'])
            ->findOrFail($issuedDocument);

        $document = $this->issuedDocuments->revoke(
            $document,
            $user,
            $validated['reason'] ?? null,
        );

        return response()->json(['data' => $document->toApiArray()]);
    }
}
