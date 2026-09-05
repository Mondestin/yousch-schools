<?php

namespace App\Support\School;

use App\Enums\AssessmentType;
use App\Enums\EnrollmentStatus;
use App\Models\AcademicYear;
use App\Models\Assessment;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Mention;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Term;
use App\Models\Track;
use App\Support\SchoolCatalog;
use Illuminate\Support\Collection;

/**
 * Ports resources/js/lib/school-grades.ts bulletin / class results computation.
 */
final class BulletinCalculator
{
    /**
     * @return array<string, mixed>|null
     */
    public function fiche(string $studentId, string $termId): ?array
    {
        $student = Student::query()->find($studentId);
        $term = Term::query()->find($termId);

        if ($student === null || $term === null) {
            return null;
        }

        $enrollment = Enrollment::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $term->academic_year_id)
            ->first()
            ?? Enrollment::query()->where('student_id', $studentId)->first();

        if ($enrollment === null) {
            return null;
        }

        $classroom = Classroom::query()->find($enrollment->classroom_id);

        if ($classroom === null) {
            return null;
        }

        $year = AcademicYear::query()->find($enrollment->academic_year_id);
        $track = $enrollment->track_id !== null
            ? Track::query()->find($enrollment->track_id)
            : null;

        $termAssessments = Assessment::query()
            ->where('term_id', $term->id)
            ->where('classroom_id', $classroom->id)
            ->get();

        $subjects = $this->classroomSubjects($classroom);
        $grades = Grade::query()
            ->where('enrollment_id', $enrollment->id)
            ->whereIn('assessment_id', $termAssessments->pluck('id'))
            ->get();

        $lines = $subjects->map(function (Subject $subject) use ($grades, $termAssessments): array {
            $notes = $grades->where('subject_id', $subject->id);
            $devoirs = $this->scoresForTypes($notes, $termAssessments, [AssessmentType::Devoir]);
            $compositions = $this->scoresForTypes($notes, $termAssessments, [
                AssessmentType::Composition,
                AssessmentType::Examen,
            ]);
            $average = $this->subjectTermAverage($devoirs, $compositions);
            $coefficient = $subject->coefficient !== null ? (float) $subject->coefficient : 1.0;

            return [
                'subjectId' => $subject->id,
                'code' => $subject->code,
                'name' => $subject->name,
                'coefficient' => $coefficient,
                'devoir' => $this->mean($devoirs),
                'composition' => $this->mean($compositions),
                'average' => $average,
                'weighted' => $average === null ? null : $average * $coefficient,
            ];
        })->values();

        $scored = $lines->filter(fn (array $line): bool => $line['average'] !== null);
        $weightSum = $scored->sum('coefficient');
        $average = $weightSum == 0
            ? null
            : $scored->sum(fn (array $line): float => (float) ($line['weighted'] ?? 0)) / $weightSum;

        $mention = $average === null ? null : $this->mentionForScore($average);
        $standings = $this->classStandings($classroom->id, $termAssessments);
        $rankIndex = $standings->search(fn (array $row): bool => $row['enrollmentId'] === $enrollment->id);

        $profile = SchoolProfile::query()->first();

        return [
            'student' => $student->toApiArray(),
            'enrollment' => $enrollment->toApiArray(),
            'classroom' => $classroom->toApiArray(),
            'year' => $year?->toApiArray(),
            'track' => $track?->toApiArray(),
            'term' => $term->toApiArray(),
            'name' => trim($student->first_name.' '.$student->last_name),
            'classroomName' => $classroom->name,
            'cycleName' => $classroom->cycle->label(),
            'yearLabel' => $year?->label ?? '—',
            'trackCode' => $track?->code,
            'lines' => $lines->all(),
            'average' => $average,
            'totalGeneral' => $scored->sum(fn (array $line): float => (float) ($line['weighted'] ?? 0)),
            'mention' => $mention,
            'result' => $average === null ? null : ($average >= 10 ? 'Admis' : 'Échoué'),
            'rank' => $rankIndex === false ? null : $rankIndex + 1,
            'classSize' => $standings->count(),
            'appreciation' => $this->appreciationForMention($mention),
            'profile' => $profile?->toApiArray() ?? SchoolCatalog::fixture()['profile'],
            'issuedOn' => now()->locale('fr')->translatedFormat('j F Y'),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function classResults(string $classroomId, string $termId): ?array
    {
        $classroom = Classroom::query()->find($classroomId);
        $term = Term::query()->find($termId);

        if ($classroom === null || $term === null) {
            return null;
        }

        $rows = Enrollment::query()
            ->where('classroom_id', $classroomId)
            ->where('status', EnrollmentStatus::Inscrit)
            ->get()
            ->map(function (Enrollment $enrollment) use ($termId): ?array {
                $fiche = $this->fiche($enrollment->student_id, $termId);

                if ($fiche === null) {
                    return null;
                }

                return [
                    'studentId' => $enrollment->student_id,
                    'matricule' => $fiche['student']['matricule'],
                    'name' => $fiche['name'],
                    'average' => $fiche['average'],
                    'mention' => $fiche['mention'],
                    'result' => $fiche['result'],
                    'rank' => $fiche['rank'],
                ];
            })
            ->filter()
            ->sortBy(fn (array $row): int => $row['rank'] ?? 99)
            ->values();

        $scored = $rows->filter(fn (array $row): bool => $row['average'] !== null);

        return [
            'classroom' => $classroom->toApiArray(),
            'term' => $term->toApiArray(),
            'rows' => $rows->all(),
            'admitted' => $scored->where('result', 'Admis')->count(),
            'failed' => $scored->where('result', 'Échoué')->count(),
            'classAverage' => $scored->isEmpty()
                ? null
                : $scored->avg('average'),
        ];
    }

    /**
     * @return Collection<int, Subject>
     */
    private function classroomSubjects(Classroom $classroom): Collection
    {
        return Subject::query()
            ->where('cycle', $classroom->cycle->value)
            ->where('grade_level_id', $classroom->grade_level_id)
            ->where(function ($query) use ($classroom): void {
                $query->whereNull('track_id');

                if ($classroom->track_id !== null) {
                    $query->orWhere('track_id', $classroom->track_id);
                }
            })
            ->orderBy('code')
            ->get();
    }

    /**
     * @param  Collection<int, Grade>  $notes
     * @param  Collection<int, Assessment>  $termAssessments
     * @param  list<AssessmentType>  $types
     * @return list<float>
     */
    private function scoresForTypes(Collection $notes, Collection $termAssessments, array $types): array
    {
        $typeValues = array_map(static fn (AssessmentType $type): string => $type->value, $types);

        return $notes
            ->filter(function (Grade $grade) use ($termAssessments, $typeValues): bool {
                $assessment = $termAssessments->firstWhere('id', $grade->assessment_id);

                return $assessment !== null && in_array($assessment->type->value, $typeValues, true);
            })
            ->map(fn (Grade $grade): float => (float) $grade->score)
            ->values()
            ->all();
    }

    /**
     * @param  list<float>  $scores
     */
    private function mean(array $scores): ?float
    {
        if ($scores === []) {
            return null;
        }

        return array_sum($scores) / count($scores);
    }

    /**
     * @param  list<float>  $devoirs
     * @param  list<float>  $compositions
     */
    private function subjectTermAverage(array $devoirs, array $compositions): ?float
    {
        $devoir = $this->mean($devoirs);
        $composition = $this->mean($compositions);

        if ($devoir !== null && $composition !== null) {
            return ($devoir + $composition) / 2;
        }

        return $devoir ?? $composition;
    }

    private function mentionForScore(float $score): ?string
    {
        $mention = Mention::query()
            ->get()
            ->first(fn (Mention $item): bool => $score >= (float) $item->min && $score <= (float) $item->max);

        return $mention?->label;
    }

    private function appreciationForMention(?string $mention): string
    {
        return match ($mention) {
            'Très bien' => 'Excellent trimestre. Poursuivez ainsi.',
            'Bien' => 'Bon trimestre. Encore un effort pour viser l’excellence.',
            'Assez bien' => 'Trimestre satisfaisant. Plus de régularité est souhaitée.',
            'Passable' => 'Résultats passables. Un travail plus assidu s’impose.',
            default => 'Résultats insuffisants. Un suivi rapproché est nécessaire.',
        };
    }

    /**
     * @param  Collection<int, Assessment>  $termAssessments
     * @return Collection<int, array{enrollmentId: string, average: float}>
     */
    private function classStandings(string $classroomId, Collection $termAssessments): Collection
    {
        return Enrollment::query()
            ->where('classroom_id', $classroomId)
            ->where('status', EnrollmentStatus::Inscrit)
            ->get()
            ->map(function (Enrollment $enrollment) use ($termAssessments): ?array {
                $average = $this->enrollmentAverage($enrollment, $termAssessments);

                if ($average === null) {
                    return null;
                }

                return [
                    'enrollmentId' => $enrollment->id,
                    'average' => $average,
                ];
            })
            ->filter()
            ->sortByDesc('average')
            ->values();
    }

    /**
     * @param  Collection<int, Assessment>  $termAssessments
     */
    private function enrollmentAverage(Enrollment $enrollment, Collection $termAssessments): ?float
    {
        $classroom = Classroom::query()->find($enrollment->classroom_id);

        if ($classroom === null) {
            return null;
        }

        $grades = Grade::query()
            ->where('enrollment_id', $enrollment->id)
            ->whereIn('assessment_id', $termAssessments->pluck('id'))
            ->get();

        $lines = $this->classroomSubjects($classroom)
            ->map(function (Subject $subject) use ($grades, $termAssessments): array {
                $notes = $grades->where('subject_id', $subject->id);
                $devoirs = $this->scoresForTypes($notes, $termAssessments, [AssessmentType::Devoir]);
                $compositions = $this->scoresForTypes($notes, $termAssessments, [
                    AssessmentType::Composition,
                    AssessmentType::Examen,
                ]);

                return [
                    'coefficient' => $subject->coefficient !== null ? (float) $subject->coefficient : 1.0,
                    'average' => $this->subjectTermAverage($devoirs, $compositions),
                ];
            })
            ->filter(fn (array $line): bool => $line['average'] !== null);

        $weightSum = $lines->sum('coefficient');

        if ($weightSum == 0) {
            return null;
        }

        return $lines->sum(fn (array $line): float => ((float) $line['average']) * ((float) $line['coefficient'])) / $weightSum;
    }
}
