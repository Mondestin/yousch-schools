<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EnrollmentController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $query = Enrollment::query()->orderBy('id');

        if ($request->filled('academicYearId')) {
            $query->where('academic_year_id', $request->string('academicYearId'));
        }

        if ($request->filled('classroomId')) {
            $query->where('classroom_id', $request->string('classroomId'));
        }

        if ($request->filled('studentId')) {
            $query->where('student_id', $request->string('studentId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $this->validatedEnrollment($request);
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

        $enrollment = Enrollment::query()->create([
            'id' => ResourceId::make('en'),
            'student_id' => $validated['studentId'],
            'classroom_id' => $validated['classroomId'],
            'academic_year_id' => $validated['academicYearId'],
            'track_id' => $validated['trackId'] ?? $classroom->track_id,
            'status' => $validated['status'] ?? EnrollmentStatus::Inscrit->value,
        ]);

        return response()->json(['data' => $enrollment->toApiArray()], 201);
    }

    public function update(Request $request, string $enrollment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Enrollment::query()->findOrFail($enrollment);
        $validated = $this->validatedEnrollment($request, $model);
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

        $model->update([
            'student_id' => $validated['studentId'],
            'classroom_id' => $validated['classroomId'],
            'academic_year_id' => $validated['academicYearId'],
            'track_id' => $validated['trackId'] ?? $classroom->track_id,
            'status' => $validated['status'] ?? $model->status->value,
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $enrollment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        Enrollment::query()->findOrFail($enrollment)->delete();

        return response()->json(['message' => 'Inscription supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedEnrollment(Request $request, ?Enrollment $existing = null): array
    {
        $studentId = $request->input('studentId', $existing?->student_id);
        $yearId = $request->input('academicYearId', $existing?->academic_year_id);

        return $request->validate([
            'studentId' => [
                'required',
                'string',
                'exists:students,id',
                Rule::unique('enrollments', 'student_id')
                    ->where(fn ($query) => $query->where('academic_year_id', $yearId))
                    ->ignore($existing?->id),
            ],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
            'status' => ['nullable', 'string', Rule::enum(EnrollmentStatus::class)],
        ], [
            'studentId.required' => 'L’élève est obligatoire.',
            'studentId.unique' => 'Cet élève a déjà une inscription pour cette année.',
            'classroomId.required' => 'La classe est obligatoire.',
            'academicYearId.required' => 'L’année scolaire est obligatoire.',
        ]);
    }

    private function assertLyceeTrack(Classroom $classroom, ?string $trackId): void
    {
        if ($classroom->cycle->isLycee() && ($trackId === null || $trackId === '') && $classroom->track_id === null) {
            throw ValidationException::withMessages([
                'trackId' => ['Choisissez une série pour le lycée.'],
            ]);
        }
    }
}
