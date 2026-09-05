<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Subject;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeacherAssignmentController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $query = TeacherAssignment::query()->orderBy('id');

        if ($request->filled('academicYearId')) {
            $query->where('academic_year_id', $request->string('academicYearId'));
        }

        if ($request->filled('teacherId')) {
            $query->where('teacher_id', $request->string('teacherId'));
        }

        if ($request->filled('classroomId')) {
            $query->where('classroom_id', $request->string('classroomId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $validated = $this->validatedAssignment($request);
        $this->assertConsistency($validated);

        $assignment = TeacherAssignment::query()->create([
            'id' => ResourceId::make('ta'),
            'teacher_id' => $validated['teacherId'],
            'academic_year_id' => $validated['academicYearId'],
            'classroom_id' => $validated['classroomId'],
            'subject_id' => $validated['subjectId'],
            'track_id' => $validated['trackId'] ?? null,
        ]);

        return response()->json(['data' => $assignment->toApiArray()], 201);
    }

    public function update(Request $request, string $teacherAssignment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $model = TeacherAssignment::query()->findOrFail($teacherAssignment);
        $validated = $this->validatedAssignment($request, $model);
        $this->assertConsistency($validated);

        $model->update([
            'teacher_id' => $validated['teacherId'],
            'academic_year_id' => $validated['academicYearId'],
            'classroom_id' => $validated['classroomId'],
            'subject_id' => $validated['subjectId'],
            'track_id' => $validated['trackId'] ?? null,
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $teacherAssignment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        TeacherAssignment::query()->findOrFail($teacherAssignment)->delete();

        return response()->json(['message' => 'Affectation supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAssignment(Request $request, ?TeacherAssignment $existing = null): array
    {
        $teacherId = $request->input('teacherId', $existing?->teacher_id);
        $yearId = $request->input('academicYearId', $existing?->academic_year_id);
        $classroomId = $request->input('classroomId', $existing?->classroom_id);
        $subjectId = $request->input('subjectId', $existing?->subject_id);

        return $request->validate([
            'teacherId' => ['required', 'string', 'exists:teachers,id'],
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'subjectId' => [
                'required',
                'string',
                'exists:subjects,id',
                Rule::unique('teacher_assignments', 'subject_id')
                    ->where(fn ($query) => $query
                        ->where('teacher_id', $teacherId)
                        ->where('academic_year_id', $yearId)
                        ->where('classroom_id', $classroomId))
                    ->ignore($existing?->id),
            ],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
        ], [
            'teacherId.required' => 'L’enseignant est obligatoire.',
            'academicYearId.required' => 'L’année scolaire est obligatoire.',
            'classroomId.required' => 'La classe est obligatoire.',
            'subjectId.required' => 'La matière est obligatoire.',
            'subjectId.unique' => 'Cette affectation existe déjà pour cet enseignant.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function assertConsistency(array $validated): void
    {
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $subject = Subject::query()->findOrFail($validated['subjectId']);

        if ($classroom->academic_year_id !== $validated['academicYearId']) {
            throw ValidationException::withMessages([
                'classroomId' => ['La classe n’appartient pas à cette année scolaire.'],
            ]);
        }

        if ($subject->cycle !== $classroom->cycle) {
            throw ValidationException::withMessages([
                'subjectId' => ['La matière doit appartenir au même cycle que la classe.'],
            ]);
        }

        $trackId = $validated['trackId'] ?? $classroom->track_id;

        if ($classroom->cycle->isLycee() && ($trackId === null || $trackId === '')) {
            throw ValidationException::withMessages([
                'trackId' => ['Choisissez une série pour le lycée.'],
            ]);
        }
    }
}
