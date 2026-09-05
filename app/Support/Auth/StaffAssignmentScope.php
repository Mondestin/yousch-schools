<?php

namespace App\Support\Auth;

use App\Enums\StaffRole;
use App\Models\Assessment;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/**
 * Restricts enseignants to their TeacherAssignment classroom × subject pairs.
 * Linked via matching Teacher.email ↔ User.email.
 */
final class StaffAssignmentScope
{
    public static function isEnseignant(User $user): bool
    {
        return $user->role === StaffRole::Enseignant;
    }

    public static function teacherFor(User $user): ?Teacher
    {
        if (! self::isEnseignant($user) || $user->email === '') {
            return null;
        }

        return Teacher::query()->where('email', $user->email)->first();
    }

    public static function canTeach(
        User $user,
        string $classroomId,
        string $subjectId,
        ?string $academicYearId = null,
    ): bool {
        if (! self::isEnseignant($user)) {
            return true;
        }

        $teacher = self::teacherFor($user);

        if ($teacher === null) {
            return false;
        }

        $query = TeacherAssignment::query()
            ->where('teacher_id', $teacher->id)
            ->where('classroom_id', $classroomId)
            ->where('subject_id', $subjectId);

        if ($academicYearId !== null) {
            $query->where('academic_year_id', $academicYearId);
        }

        return $query->exists();
    }

    public static function canTeachClassroom(User $user, string $classroomId): bool
    {
        if (! self::isEnseignant($user)) {
            return true;
        }

        $teacher = self::teacherFor($user);

        if ($teacher === null) {
            return false;
        }

        return TeacherAssignment::query()
            ->where('teacher_id', $teacher->id)
            ->where('classroom_id', $classroomId)
            ->exists();
    }

    public static function canTeachAssessment(User $user, Assessment $assessment): bool
    {
        return self::canTeach($user, $assessment->classroom_id, $assessment->subject_id);
    }

    public static function denyUnlessCanTeach(
        User $user,
        string $classroomId,
        string $subjectId,
        ?string $academicYearId = null,
    ): ?JsonResponse {
        if (self::canTeach($user, $classroomId, $subjectId, $academicYearId)) {
            return null;
        }

        return response()->json([
            'message' => 'Vous n’êtes pas affecté à cette classe ou matière.',
        ], 403);
    }

    public static function denyUnlessCanTeachClassroom(User $user, string $classroomId): ?JsonResponse
    {
        if (self::canTeachClassroom($user, $classroomId)) {
            return null;
        }

        return response()->json([
            'message' => 'Vous n’êtes pas affecté à cette classe.',
        ], 403);
    }

    public static function denyUnlessCanTeachAssessment(User $user, Assessment $assessment): ?JsonResponse
    {
        return self::denyUnlessCanTeach($user, $assessment->classroom_id, $assessment->subject_id);
    }

    /**
     * @param  Builder<Assessment>  $query
     * @return Builder<Assessment>
     */
    public static function constrainAssessments(Builder $query, User $user): Builder
    {
        if (! self::isEnseignant($user)) {
            return $query;
        }

        $teacher = self::teacherFor($user);

        if ($teacher === null) {
            return $query->whereRaw('0 = 1');
        }

        $pairs = TeacherAssignment::query()
            ->where('teacher_id', $teacher->id)
            ->get(['classroom_id', 'subject_id']);

        if ($pairs->isEmpty()) {
            return $query->whereRaw('0 = 1');
        }

        return $query->where(function (Builder $builder) use ($pairs): void {
            foreach ($pairs as $pair) {
                $builder->orWhere(function (Builder $inner) use ($pair): void {
                    $inner
                        ->where('classroom_id', $pair->classroom_id)
                        ->where('subject_id', $pair->subject_id);
                });
            }
        });
    }
}
