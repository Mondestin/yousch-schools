<?php

namespace App\Support\Auth;

use App\Enums\Cycle;
use App\Enums\StaffRole;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Creates login accounts for pupils (collège / lycée) and parents with an e-mail.
 * Portal accounts do not consume staff subscription seats.
 */
final class PortalAccountProvisioner
{
    public static function forStudent(Student $student, ?Cycle $cycle = null): ?User
    {
        $cycle ??= self::cycleForStudent($student);

        if ($cycle === null || ! $cycle->needsStudentPortal()) {
            return null;
        }

        $email = self::normalizedEmail($student->email);

        if ($email === null) {
            throw ValidationException::withMessages([
                'email' => 'Un e-mail est obligatoire pour créer le compte élève (collège / lycée).',
            ]);
        }

        if ($student->user_id !== null) {
            return User::query()->find($student->user_id);
        }

        [$user, $created] = self::findOrCreateUser(
            email: $email,
            name: trim($student->first_name.' '.$student->last_name),
            phone: $student->phone,
            role: StaffRole::Eleve,
        );

        $student->forceFill(['user_id' => $user->id])->save();

        if ($created) {
            self::queueCredentialsEmail($user);
        }

        return $user;
    }

    public static function forGuardian(Guardian $guardian): ?User
    {
        $email = self::normalizedEmail($guardian->email);

        if ($email === null) {
            return null;
        }

        if ($guardian->user_id !== null) {
            return User::query()->find($guardian->user_id);
        }

        [$user, $created] = self::findOrCreateUser(
            email: $email,
            name: trim($guardian->first_name.' '.$guardian->last_name),
            phone: $guardian->phone !== '' ? $guardian->phone : null,
            role: StaffRole::Parent,
        );

        $linkedElsewhere = Guardian::query()
            ->where('user_id', $user->id)
            ->where('id', '!=', $guardian->id)
            ->exists();

        if ($linkedElsewhere) {
            throw ValidationException::withMessages([
                'guardianEmail' => sprintf(
                    'L’e-mail %s est déjà lié à un autre tuteur.',
                    $email,
                ),
            ]);
        }

        $guardian->forceFill(['user_id' => $user->id])->save();

        if ($created) {
            self::queueCredentialsEmail($user);
        }

        return $user;
    }

    public static function cycleForStudent(Student $student): ?Cycle
    {
        $enrollment = $student->relationLoaded('enrollments')
            ? $student->enrollments->sortByDesc('created_at')->first()
            : Enrollment::query()
                ->where('student_id', $student->id)
                ->orderByDesc('created_at')
                ->first();

        if ($enrollment === null) {
            return null;
        }

        $classroom = Classroom::query()->find($enrollment->classroom_id);

        return $classroom?->cycle;
    }

    /**
     * @return array{0: User, 1: bool}
     */
    private static function findOrCreateUser(
        string $email,
        string $name,
        ?string $phone,
        StaffRole $role,
    ): array {
        $schoolId = CurrentSchool::require()->id;

        $existing = User::query()
            ->where('school_id', $schoolId)
            ->whereRaw('lower(email) = ?', [mb_strtolower($email)])
            ->first();

        if ($existing !== null) {
            if ($existing->role !== $role) {
                throw ValidationException::withMessages([
                    'email' => sprintf(
                        'L’e-mail %s est déjà utilisé par un autre type de compte.',
                        $email,
                    ),
                ]);
            }

            return [$existing, false];
        }

        $user = User::query()->create([
            'name' => $name !== '' ? $name : $email,
            'email' => $email,
            'phone' => $phone,
            'role' => $role,
            'cycles' => [],
            'password' => 'temporary',
            'email_verified_at' => now(),
            'school_id' => $schoolId,
        ]);

        return [$user, true];
    }

    private static function queueCredentialsEmail(User $user): void
    {
        $send = static function () use ($user): void {
            StaffCredentialsMailer::send($user->fresh() ?? $user, resend: false);
        };

        if (DB::transactionLevel() > 0) {
            DB::afterCommit($send);

            return;
        }

        $send();
    }

    private static function normalizedEmail(?string $email): ?string
    {
        if ($email === null) {
            return null;
        }

        $trimmed = trim($email);

        return $trimmed === '' ? null : $trimmed;
    }
}
