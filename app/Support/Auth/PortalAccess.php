<?php

namespace App\Support\Auth;

use App\Enums\StaffRole;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Resolves which students a portal account (élève / parent) may read.
 */
final class PortalAccess
{
    public static function denyUnlessPortal(User $user): ?JsonResponse
    {
        if ($user->canAccess('portal')) {
            return null;
        }

        return response()->json(['message' => 'Accès réservé au portail élève / parent.'], 403);
    }

    /**
     * @return Collection<int, Student>
     */
    public static function studentsFor(User $user): Collection
    {
        return match ($user->role) {
            StaffRole::Eleve => Student::query()
                ->with(['enrollments', 'dossierFiles', 'guardians'])
                ->where('user_id', $user->id)
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get(),
            StaffRole::Parent => self::guardianFor($user)
                ?->students()
                ->with(['enrollments', 'dossierFiles', 'guardians'])
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ?? collect(),
            default => collect(),
        };
    }

    public static function findAccessibleStudent(User $user, string $studentId): ?Student
    {
        return self::studentsFor($user)->firstWhere('id', $studentId);
    }

    public static function requireStudent(User $user, string $studentId): Student|JsonResponse
    {
        $student = self::findAccessibleStudent($user, $studentId);

        if ($student === null) {
            return response()->json(['message' => 'Élève introuvable.'], 404);
        }

        return $student;
    }

    public static function guardianFor(User $user): ?Guardian
    {
        return Guardian::query()
            ->where('user_id', $user->id)
            ->first();
    }
}
