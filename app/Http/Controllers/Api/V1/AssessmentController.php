<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AssessmentType;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Auth\StaffAssignmentScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssessmentController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $query = Assessment::query()->orderByDesc('held_on')->orderBy('name');
        $query = StaffAssignmentScope::constrainAssessments($query, $user);

        if ($request->filled('classroomId')) {
            $query->where('classroom_id', $request->string('classroomId'));
        }

        if ($request->filled('termId')) {
            $query->where('term_id', $request->string('termId'));
        }

        if ($request->filled('subjectId')) {
            $query->where('subject_id', $request->string('subjectId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $model = Assessment::query()->findOrFail($assessment);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeachAssessment($user, $model)) {
            return $denied;
        }

        return response()->json(['data' => $model->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $validated = $this->validatedAssessment($request);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeach(
            $user,
            $validated['classroomId'],
            $validated['subjectId'],
        )) {
            return $denied;
        }

        $assessment = Assessment::query()->create([
            'id' => ResourceId::make('as'),
            'type' => $validated['type'],
            'name' => $validated['name'],
            'classroom_id' => $validated['classroomId'],
            'subject_id' => $validated['subjectId'],
            'term_id' => $validated['termId'],
            'held_on' => $validated['heldOn'],
            'held_at' => $validated['heldAt'],
            'held_until' => $validated['heldUntil'],
        ]);

        return response()->json(['data' => $assessment->toApiArray()], 201);
    }

    public function update(Request $request, string $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $model = Assessment::query()->findOrFail($assessment);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeachAssessment($user, $model)) {
            return $denied;
        }

        $validated = $this->validatedAssessment($request);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeach(
            $user,
            $validated['classroomId'],
            $validated['subjectId'],
        )) {
            return $denied;
        }

        $model->update([
            'type' => $validated['type'],
            'name' => $validated['name'],
            'classroom_id' => $validated['classroomId'],
            'subject_id' => $validated['subjectId'],
            'term_id' => $validated['termId'],
            'held_on' => $validated['heldOn'],
            'held_at' => $validated['heldAt'],
            'held_until' => $validated['heldUntil'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $model = Assessment::query()->findOrFail($assessment);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeachAssessment($user, $model)) {
            return $denied;
        }

        $model->delete();

        return response()->json(['message' => 'Évaluation supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAssessment(Request $request): array
    {
        return $request->validate([
            'type' => ['required', 'string', Rule::enum(AssessmentType::class)],
            'name' => ['required', 'string', 'max:180'],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'subjectId' => ['required', 'string', 'exists:subjects,id'],
            'termId' => ['required', 'string', 'exists:terms,id'],
            'heldOn' => ['required', 'date'],
            'heldAt' => ['required', 'string', 'max:8'],
            'heldUntil' => ['required', 'string', 'max:8'],
        ], [
            'type.required' => 'Le type d’évaluation est obligatoire.',
            'name.required' => 'Le nom de l’évaluation est obligatoire.',
            'classroomId.required' => 'La classe est obligatoire.',
            'subjectId.required' => 'La matière est obligatoire.',
            'termId.required' => 'Le trimestre est obligatoire.',
            'heldOn.required' => 'La date est obligatoire.',
            'heldAt.required' => 'L’heure de début est obligatoire.',
            'heldUntil.required' => 'L’heure de fin est obligatoire.',
        ]);
    }
}
