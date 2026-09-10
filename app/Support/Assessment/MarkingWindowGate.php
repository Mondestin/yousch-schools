<?php

namespace App\Support\Assessment;

use App\Enums\AssessmentType;
use App\Enums\StaffRole;
use App\Models\Assessment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\MarkingWindow;
use App\Models\Term;
use App\Models\User;
use App\Support\School\SchoolClock;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

final class MarkingWindowGate
{
    public static function isPrivileged(User $user): bool
    {
        return in_array($user->role, [StaffRole::Admin, StaffRole::Directeur], true);
    }

    public static function windowFor(string $termId, AssessmentType $type): ?MarkingWindow
    {
        return MarkingWindow::query()
            ->where('term_id', $termId)
            ->where('type', $type->value)
            ->first();
    }

    public static function assertCanEnterGrades(User $user, Assessment $assessment): ?JsonResponse
    {
        if (self::isPrivileged($user)) {
            return null;
        }

        $type = $assessment->type;
        $window = self::windowFor($assessment->term_id, $type);

        if ($type === AssessmentType::Composition || $type === AssessmentType::Examen) {
            if ($window === null) {
                throw ValidationException::withMessages([
                    'assessmentId' => ['La période de saisie pour cette évaluation n’est pas encore ouverte.'],
                ]);
            }

            return self::assertWindowAllowsEntry($window);
        }

        // Devoir: free entry unless a window exists.
        if ($window === null) {
            return null;
        }

        return self::assertWindowAllowsEntry($window);
    }

    public static function assertBulletinsReleased(string $termId): ?JsonResponse
    {
        foreach ([AssessmentType::Devoir, AssessmentType::Composition] as $type) {
            $window = self::windowFor($termId, $type);

            if ($window === null || $window->closed_at === null) {
                throw ValidationException::withMessages([
                    'termId' => ['Les sections de saisie doivent être clôturées par l’administration.'],
                ]);
            }
        }

        return null;
    }

    public static function assertStudentHasDevoirAndCompositionGrades(
        string $studentId,
        string $termId,
    ): ?JsonResponse {
        $term = Term::query()->find($termId);

        if ($term === null) {
            return response()->json(['message' => 'Bulletin introuvable pour cet élève et ce trimestre.'], 404);
        }

        $enrollment = Enrollment::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $term->academic_year_id)
            ->first()
            ?? Enrollment::query()->where('student_id', $studentId)->first();

        if ($enrollment === null) {
            return response()->json(['message' => 'Bulletin introuvable pour cet élève et ce trimestre.'], 404);
        }

        $assessments = Assessment::query()
            ->where('term_id', $termId)
            ->where('classroom_id', $enrollment->classroom_id)
            ->get();

        $devoirIds = $assessments
            ->where('type', AssessmentType::Devoir)
            ->pluck('id');
        $compositionIds = $assessments
            ->where('type', AssessmentType::Composition)
            ->pluck('id');

        $hasDevoir = $devoirIds->isNotEmpty()
            && Grade::query()
                ->where('enrollment_id', $enrollment->id)
                ->whereIn('assessment_id', $devoirIds)
                ->exists();

        $hasComposition = $compositionIds->isNotEmpty()
            && Grade::query()
                ->where('enrollment_id', $enrollment->id)
                ->whereIn('assessment_id', $compositionIds)
                ->exists();

        if (! $hasDevoir || ! $hasComposition) {
            throw ValidationException::withMessages([
                'termId' => ['Le bulletin nécessite des notes de devoirs et de compositions pour ce trimestre.'],
            ]);
        }

        return null;
    }

    private static function assertWindowAllowsEntry(MarkingWindow $window): ?JsonResponse
    {
        if ($window->closed_at !== null) {
            throw ValidationException::withMessages([
                'assessmentId' => ['La saisie des notes est clôturée pour cette section.'],
            ]);
        }

        $today = SchoolClock::today();
        $opensOn = $window->opens_on->format('Y-m-d');
        $closesOn = $window->closes_on->format('Y-m-d');

        if ($today < $opensOn || $today > $closesOn) {
            throw ValidationException::withMessages([
                'assessmentId' => ['La saisie des notes n’est autorisée que pendant la période définie.'],
            ]);
        }

        return null;
    }
}
