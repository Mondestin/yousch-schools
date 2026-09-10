<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Assessment\MarkingWindowGate;
use App\Support\Auth\StaffAssignmentScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GradeController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $query = Grade::query()->orderBy('id');

        if ($request->filled('assessmentId')) {
            $query->where('assessment_id', $request->string('assessmentId'));
        }

        if ($request->filled('enrollmentId')) {
            $query->where('enrollment_id', $request->string('enrollmentId'));
        }

        if (StaffAssignmentScope::isEnseignant($user)) {
            $allowedAssessmentIds = StaffAssignmentScope::constrainAssessments(
                Assessment::query(),
                $user,
            )->pluck('id');

            $query->whereIn('assessment_id', $allowedAssessmentIds);
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    /**
     * Bulk upsert for the saisie grid.
     */
    public function upsert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $validated = $request->validate([
            'assessmentId' => ['required', 'string', 'exists:assessments,id'],
            'grades' => ['required', 'array', 'min:1'],
            'grades.*.enrollmentId' => ['required', 'string', 'exists:enrollments,id'],
            'grades.*.score' => ['required', 'numeric', 'min:0', 'max:20'],
        ], [
            'assessmentId.required' => 'L’évaluation est obligatoire.',
            'grades.required' => 'Les notes sont obligatoires.',
            'grades.*.enrollmentId.required' => 'L’inscription est obligatoire.',
            'grades.*.score.required' => 'La note est obligatoire.',
            'grades.*.score.min' => 'La note doit être entre 0 et 20.',
            'grades.*.score.max' => 'La note doit être entre 0 et 20.',
        ]);

        $assessment = Assessment::query()
            ->whereKey($validated['assessmentId'])
            ->first();

        if ($assessment === null) {
            abort(404);
        }

        if ($denied = StaffAssignmentScope::denyUnlessCanTeachAssessment($user, $assessment)) {
            return $denied;
        }

        if ($denied = MarkingWindowGate::assertCanEnterGrades($user, $assessment)) {
            return $denied;
        }

        $classroomEnrollmentIds = Enrollment::query()
            ->where('classroom_id', $assessment->classroom_id)
            ->pluck('id')
            ->all();

        $saved = DB::transaction(function () use ($validated, $assessment, $classroomEnrollmentIds): array {
            $rows = [];

            foreach ($validated['grades'] as $index => $row) {
                if (! in_array($row['enrollmentId'], $classroomEnrollmentIds, true)) {
                    throw ValidationException::withMessages([
                        "grades.{$index}.enrollmentId" => ['Cette inscription n’appartient pas à la classe de l’évaluation.'],
                    ]);
                }

                $existing = Grade::query()
                    ->where('enrollment_id', $row['enrollmentId'])
                    ->where('assessment_id', $assessment->id)
                    ->where('subject_id', $assessment->subject_id)
                    ->first();

                if ($existing !== null) {
                    $existing->update(['score' => $row['score']]);
                    $rows[] = $existing->fresh();
                } else {
                    $rows[] = Grade::query()->create([
                        'id' => ResourceId::make('gr'),
                        'enrollment_id' => $row['enrollmentId'],
                        'assessment_id' => $assessment->id,
                        'subject_id' => $assessment->subject_id,
                        'score' => $row['score'],
                    ]);
                }
            }

            return $rows;
        });

        return response()->json([
            'data' => collect($saved)
                ->filter(fn (mixed $row): bool => $row instanceof Grade)
                ->map(fn (Grade $row): array => $row->toApiArray())
                ->values()
                ->all(),
        ]);
    }

    public function destroy(Request $request, string $grade): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $model = Grade::query()->with('assessment')->whereKey($grade)->first();

        if ($model === null) {
            abort(404);
        }

        if ($model->assessment !== null
            && ($denied = StaffAssignmentScope::denyUnlessCanTeachAssessment($user, $model->assessment))) {
            return $denied;
        }

        if ($model->assessment !== null
            && ($denied = MarkingWindowGate::assertCanEnterGrades($user, $model->assessment))) {
            return $denied;
        }

        $model->delete();

        return response()->json(['message' => 'Note supprimée.']);
    }
}
