<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DocumentKind;
use App\Enums\DocumentRequestStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\Student;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Documents\DocumentAuthenticity;
use App\Support\Documents\IssuedDocumentService;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class DocumentRequestController extends Controller
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
            'status' => ['nullable', 'string', Rule::enum(DocumentRequestStatus::class)],
            'studentId' => ['nullable', 'string', 'exists:students,id'],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $query = DocumentRequest::query()
            ->with(['student', 'academicYear', 'requester'])
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->orderByDesc('created_at');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['studentId'])) {
            $query->where('student_id', $validated['studentId']);
        }

        if (! empty($validated['q'])) {
            $needle = '%'.$validated['q'].'%';
            $query->where(function ($builder) use ($needle): void {
                $builder
                    ->where('note', 'like', $needle)
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

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $request->validate([
            'studentId' => ['required', 'string', 'exists:students,id'],
            'kind' => ['required', 'string', Rule::in(DocumentKind::issuableValues())],
            'academicYearId' => ['nullable', 'string', 'exists:academic_years,id'],
            'note' => ['nullable', 'string', 'max:255'],
        ], [
            'studentId.required' => 'L’élève est obligatoire.',
            'kind.required' => 'Le type de document est obligatoire.',
            'kind.in' => 'Type de document non pris en charge.',
        ]);

        Student::query()->findOrFail($validated['studentId']);

        $schoolId = CurrentSchool::id();

        if ($schoolId === null) {
            return response()->json(['message' => 'École introuvable.'], 422);
        }

        $exists = DocumentRequest::query()
            ->where('student_id', $validated['studentId'])
            ->where('kind', $validated['kind'])
            ->where('status', DocumentRequestStatus::Pending)
            ->when(
                ! empty($validated['academicYearId']),
                fn ($query) => $query->where('academic_year_id', $validated['academicYearId']),
            )
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Une demande similaire est déjà en attente.',
            ], 422);
        }

        $documentRequest = DocumentRequest::query()->create([
            'id' => ResourceId::make('dreq'),
            'school_id' => $schoolId,
            'student_id' => $validated['studentId'],
            'academic_year_id' => $validated['academicYearId'] ?? null,
            'kind' => DocumentKind::from($validated['kind']),
            'status' => DocumentRequestStatus::Pending,
            'note' => $validated['note'] ?? null,
            'requested_by' => $user->id,
        ]);

        $documentRequest->load(['student', 'academicYear', 'requester']);

        return response()->json([
            'data' => $documentRequest->toApiArray(),
        ], 201);
    }

    public function approve(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        if ($documentRequest->status !== DocumentRequestStatus::Pending) {
            return response()->json([
                'message' => 'Cette demande a déjà été traitée.',
            ], 422);
        }

        try {
            $issued = $this->issuedDocuments->issue(
                $documentRequest->student_id,
                $documentRequest->kind,
                $documentRequest->academic_year_id,
                $user,
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $documentRequest->forceFill([
            'status' => DocumentRequestStatus::Approved,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_note' => null,
            'issued_document_id' => $issued->id,
        ])->save();

        $documentRequest->load(['student', 'academicYear', 'requester']);
        $issued->load(['student', 'academicYear']);

        $verifyUrl = DocumentAuthenticity::url([
            'type' => $issued->kind,
            'studentId' => $issued->student_id,
            'refId' => $issued->id,
            'academicYearId' => $issued->academic_year_id,
            'issuedOn' => $issued->issued_on->toDateString(),
        ]);

        return response()->json([
            'data' => [
                'request' => $documentRequest->toApiArray(),
                'document' => [
                    ...$issued->toApiArray(),
                    'verifyUrl' => $verifyUrl,
                ],
            ],
        ]);
    }

    public function reject(Request $request, DocumentRequest $documentRequest): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        if ($documentRequest->status !== DocumentRequestStatus::Pending) {
            return response()->json([
                'message' => 'Cette demande a déjà été traitée.',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $documentRequest->forceFill([
            'status' => DocumentRequestStatus::Rejected,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_note' => $validated['reason'] ?? null,
        ])->save();

        $documentRequest->load(['student', 'academicYear', 'requester']);

        return response()->json([
            'data' => $documentRequest->toApiArray(),
        ]);
    }
}
