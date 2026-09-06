<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Weekday;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\CycleSchedule;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Auth\StaffAssignmentScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TimetableSlotController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'timetable')) {
            return $denied;
        }

        $query = TimetableSlot::query()->orderBy('weekday')->orderBy('period_id');

        if ($request->filled('academicYearId')) {
            $query->where('academic_year_id', $request->string('academicYearId'));
        }

        if ($request->filled('classroomId')) {
            $query->where('classroom_id', $request->string('classroomId'));
        }

        if ($request->filled('teacherId')) {
            $query->where('teacher_id', $request->string('teacherId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'timetable')) {
            return $denied;
        }

        $validated = $this->validatedSlot($request);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeach(
            $user,
            $validated['classroomId'],
            $validated['subjectId'],
            $validated['academicYearId'],
        )) {
            return $denied;
        }

        $this->assertPeriodBelongsToClassroom($validated);
        $this->assertNoConflict($validated);

        $slot = TimetableSlot::query()->create([
            'id' => ResourceId::make('ts'),
            'academic_year_id' => $validated['academicYearId'],
            'classroom_id' => $validated['classroomId'],
            'weekday' => $validated['weekday'],
            'period_id' => $validated['periodId'],
            'subject_id' => $validated['subjectId'],
            'teacher_id' => $validated['teacherId'],
            'room' => $validated['room'] ?? null,
        ]);

        return response()->json(['data' => $slot->toApiArray()], 201);
    }

    public function update(Request $request, string $timetableSlot): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'timetable')) {
            return $denied;
        }

        $model = TimetableSlot::query()->findOrFail($timetableSlot);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeach(
            $user,
            $model->classroom_id,
            $model->subject_id,
            $model->academic_year_id,
        )) {
            return $denied;
        }

        $validated = $this->validatedSlot($request, $model);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeach(
            $user,
            $validated['classroomId'],
            $validated['subjectId'],
            $validated['academicYearId'],
        )) {
            return $denied;
        }

        $this->assertPeriodBelongsToClassroom($validated);
        $this->assertNoConflict($validated, $model->id);

        $model->update([
            'academic_year_id' => $validated['academicYearId'],
            'classroom_id' => $validated['classroomId'],
            'weekday' => $validated['weekday'],
            'period_id' => $validated['periodId'],
            'subject_id' => $validated['subjectId'],
            'teacher_id' => $validated['teacherId'],
            'room' => $validated['room'] ?? null,
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $timetableSlot): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'timetable')) {
            return $denied;
        }

        $model = TimetableSlot::query()->findOrFail($timetableSlot);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeach(
            $user,
            $model->classroom_id,
            $model->subject_id,
            $model->academic_year_id,
        )) {
            return $denied;
        }

        $model->delete();

        return response()->json(['message' => 'Créneau supprimé.']);
    }

    /**
     * @return array{
     *     academicYearId: string,
     *     classroomId: string,
     *     weekday: string,
     *     periodId: string,
     *     subjectId: string,
     *     teacherId: string,
     *     room?: string|null
     * }
     */
    private function validatedSlot(Request $request, ?TimetableSlot $existing = null): array
    {
        return $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'weekday' => ['required', 'string', Rule::enum(Weekday::class)],
            'periodId' => ['required', 'string', 'max:40'],
            'subjectId' => ['required', 'string', 'exists:subjects,id'],
            'teacherId' => ['required', 'string', 'exists:teachers,id'],
            'room' => ['nullable', 'string', 'max:120'],
        ], [
            'classroomId.required' => 'La classe est obligatoire.',
            'weekday.required' => 'Le jour est obligatoire.',
            'periodId.required' => 'Le créneau horaire est obligatoire.',
            'subjectId.required' => 'La matière est obligatoire.',
            'teacherId.required' => 'L’enseignant est obligatoire.',
        ]);
    }

    /**
     * @param  array{
     *     academicYearId: string,
     *     classroomId: string,
     *     weekday: string,
     *     periodId: string,
     *     subjectId: string,
     *     teacherId: string,
     *     room?: string|null
     * }  $validated
     */
    private function assertPeriodBelongsToClassroom(array $validated): void
    {
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);

        if ($classroom->academic_year_id !== $validated['academicYearId']) {
            throw ValidationException::withMessages([
                'classroomId' => ['La classe n’appartient pas à cette année scolaire.'],
            ]);
        }

        $schedule = CycleSchedule::query()->where('cycle', $classroom->cycle->value)->first();
        $periodIds = $schedule === null
            ? []
            : collect($schedule->periods)->pluck('id')->all();

        if ($periodIds !== [] && ! in_array($validated['periodId'], $periodIds, true)) {
            throw ValidationException::withMessages([
                'periodId' => ['Ce créneau n’existe pas dans l’horaire du cycle.'],
            ]);
        }
    }

    /**
     * @param  array{
     *     academicYearId: string,
     *     classroomId: string,
     *     weekday: string,
     *     periodId: string,
     *     subjectId: string,
     *     teacherId: string,
     *     room?: string|null
     * }  $validated
     */
    private function assertNoConflict(array $validated, ?string $ignoreId = null): void
    {
        $sameHour = TimetableSlot::query()
            ->where('weekday', $validated['weekday'])
            ->where('period_id', $validated['periodId'])
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->get();

        if ($sameHour->contains(fn (TimetableSlot $slot): bool => $slot->classroom_id === $validated['classroomId'])) {
            throw ValidationException::withMessages([
                'periodId' => ['Cette classe a déjà un cours à cet horaire.'],
            ]);
        }

        if ($sameHour->contains(fn (TimetableSlot $slot): bool => $slot->teacher_id === $validated['teacherId'])) {
            throw ValidationException::withMessages([
                'teacherId' => ['Cet enseignant a déjà un cours à cet horaire.'],
            ]);
        }
    }
}
