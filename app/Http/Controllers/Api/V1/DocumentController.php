<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DocumentKind;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Support\School\SchoolDocumentBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    use EnsuresStaffAbility;

    public function __construct(private SchoolDocumentBuilder $documents) {}

    public function show(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $request->validate([
            'kind' => ['required', 'string', Rule::in(DocumentKind::issuableValues())],
            'academicYearId' => ['nullable', 'string', 'exists:academic_years,id'],
        ], [
            'kind.required' => 'Le type de document est obligatoire.',
            'kind.in' => 'Type de document non pris en charge.',
        ]);

        $payload = $this->documents->forStudent(
            $student,
            $validated['kind'],
            $validated['academicYearId'] ?? null,
        );

        if ($payload === null) {
            return response()->json(['message' => 'Document introuvable pour cet élève.'], 404);
        }

        return response()->json(['data' => $payload]);
    }

    public function files(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Student::query()->with('dossierFiles')->findOrFail($student);

        return response()->json([
            'data' => $model->dossierFiles->map->toApiArray()->values()->all(),
        ]);
    }
}
