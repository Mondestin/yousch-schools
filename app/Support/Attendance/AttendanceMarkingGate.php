<?php

namespace App\Support\Attendance;

use App\Enums\StaffRole;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\CycleSchedule;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Support\Auth\StaffAssignmentScope;
use App\Support\School\SchoolClock;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

final class AttendanceMarkingGate
{
    public static function isPrivileged(User $user): bool
    {
        return in_array($user->role, [StaffRole::Admin, StaffRole::Directeur], true);
    }

    public static function assertCanMutateStudentMarks(User $user, string $date, ?string $slotId): ?JsonResponse
    {
        if ($slotId === null || $slotId === '') {
            throw ValidationException::withMessages([
                'slotId' => ['Le créneau est obligatoire.'],
            ]);
        }

        if (self::isPrivileged($user)) {
            return null;
        }

        return self::assertTeacherCanMarkDuringSignedWindow($user, $date, $slotId, requireSignature: true);
    }

    /**
     * Shared checks for enseignant signing a session or marking students.
     */
    public static function assertTeacherCanMarkDuringSignedWindow(
        User $user,
        string $date,
        string $slotId,
        bool $requireSignature,
    ): ?JsonResponse {
        if ($date !== SchoolClock::today()) {
            throw ValidationException::withMessages([
                'date' => ['Vous ne pouvez marquer les présences que le jour même.'],
            ]);
        }

        $slot = TimetableSlot::query()->find($slotId);

        if ($slot === null) {
            throw ValidationException::withMessages([
                'slotId' => ['Ce créneau est introuvable.'],
            ]);
        }

        $teacher = StaffAssignmentScope::teacherFor($user);

        if ($teacher === null) {
            return response()->json([
                'message' => 'Aucun profil enseignant lié à votre compte.',
            ], 403);
        }

        if ($slot->teacher_id !== $teacher->id) {
            return response()->json([
                'message' => 'Vous n’êtes pas l’enseignant de ce créneau.',
            ], 403);
        }

        $windowDenied = self::assertWithinSlotPeriodWindow($slot);

        if ($windowDenied !== null) {
            return $windowDenied;
        }

        if (! $requireSignature) {
            return null;
        }

        $session = AttendanceSession::query()
            ->where('teacher_id', $teacher->id)
            ->whereDate('date', $date)
            ->where('slot_id', $slotId)
            ->first();

        if ($session === null || blank($session->signature_data)) {
            throw ValidationException::withMessages([
                'signature' => ['Signez d’abord votre présence pour démarrer l’appel.'],
            ]);
        }

        return null;
    }

    public static function assertWithinSlotPeriodWindow(TimetableSlot $slot): ?JsonResponse
    {
        $classroom = Classroom::query()->find($slot->classroom_id);

        if ($classroom === null) {
            throw ValidationException::withMessages([
                'slotId' => ['La classe du créneau est introuvable.'],
            ]);
        }

        $schedule = CycleSchedule::query()
            ->where('cycle', $classroom->cycle)
            ->first();

        $periods = is_array($schedule?->periods) ? $schedule->periods : [];
        $period = collect($periods)->first(
            static fn (mixed $row): bool => is_array($row)
                && ($row['id'] ?? null) === $slot->period_id,
        );

        $startsAt = is_array($period) ? ($period['startsAt'] ?? null) : null;
        $endsAt = is_array($period) ? ($period['endsAt'] ?? null) : null;

        if (! is_string($startsAt) || $startsAt === '' || ! is_string($endsAt) || $endsAt === '') {
            throw ValidationException::withMessages([
                'slotId' => ['Les horaires de ce créneau sont introuvables.'],
            ]);
        }

        $nowHi = SchoolClock::now()->format('H:i');

        if ($nowHi < $startsAt || $nowHi > $endsAt) {
            throw ValidationException::withMessages([
                'slotId' => ['L’appel n’est possible que pendant le créneau horaire du cours.'],
            ]);
        }

        return null;
    }
}
