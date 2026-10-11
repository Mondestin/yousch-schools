<?php

namespace Database\Seeders;

use App\Enums\AssessmentType;
use App\Enums\EnrollmentStatus;
use App\Models\Assessment;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\MarkingWindow;
use App\Models\School;
use App\Models\Subject;
use App\Models\Term;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Seeder;

/**
 * Seeds a full trimestre of évaluations + notes for every class, and closes
 * devoir/composition marking windows so bulletins can be previewed.
 */
class SchoolBulletinsSeeder extends Seeder
{
    public const TERM_ID = 'term-2026-1';

    public function run(): void
    {
        if (CurrentSchool::get() === null) {
            $school = School::query()->where('domain', 'palmiers')->first()
                ?? School::query()->first();

            if ($school === null) {
                $this->command?->warn('SchoolBulletinsSeeder: no school — skip.');

                return;
            }

            CurrentSchool::set($school);
        }

        $schoolId = CurrentSchool::require()->id;
        $term = Term::query()->find(self::TERM_ID);

        if ($term === null) {
            $this->command?->warn('SchoolBulletinsSeeder: term '.self::TERM_ID.' missing — skip.');

            return;
        }

        $this->closeMarkingWindows($schoolId, $term);
        $this->ensureBulletinSubjects($schoolId);

        $classrooms = Classroom::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->orderBy('id')
            ->get();

        $assessments = 0;
        $grades = 0;

        foreach ($classrooms as $classroom) {
            $enrollments = Enrollment::query()
                ->where('classroom_id', $classroom->id)
                ->where('academic_year_id', $term->academic_year_id)
                ->where('status', EnrollmentStatus::Inscrit)
                ->get();

            if ($enrollments->isEmpty()) {
                continue;
            }

            $subjects = $this->subjectsForClassroom($classroom);

            if ($subjects->isEmpty()) {
                continue;
            }

            [$createdAssessments, $createdGrades] = $this->seedClassroomTerm(
                $schoolId,
                $classroom,
                $term,
                $subjects,
                $enrollments,
            );

            $assessments += $createdAssessments;
            $grades += $createdGrades;
        }

        $this->command?->info("SchoolBulletinsSeeder: {$assessments} évaluations, {$grades} notes, fenêtres clôturées pour ".self::TERM_ID);
        $this->command?->line('  Preview: /bulletins/{studentId}?trimestre='.self::TERM_ID);
        $this->command?->line('  Exemple: /bulletins/st-demo-portal?trimestre='.self::TERM_ID);
    }

    private function closeMarkingWindows(string $schoolId, Term $term): void
    {
        $terms = Term::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->orderBy('id')
            ->get();

        foreach ($terms as $row) {
            foreach ([AssessmentType::Devoir, AssessmentType::Composition] as $type) {
                MarkingWindow::query()->updateOrCreate(
                    [
                        'school_id' => $schoolId,
                        'term_id' => $row->id,
                        'type' => $type->value,
                    ],
                    [
                        'id' => 'mw-'.$row->id.'-'.$type->value,
                        'opens_on' => $row->starts_on->format('Y-m-d'),
                        'closes_on' => $row->ends_on->format('Y-m-d'),
                        'closed_at' => now()->subDay(),
                        'opened_notified_at' => now()->subWeeks(6),
                        'closing_reminder_sent_at' => now()->subDays(2),
                    ],
                );
            }
        }
    }

    /**
     * Extra subjects for 6ème so bulletins have a full subject list.
     */
    private function ensureBulletinSubjects(string $schoolId): void
    {
        $extras = [
            ['id' => 'su-hist-6eme', 'code' => 'HIST', 'name' => 'Histoire-Géo', 'coefficient' => 2],
            ['id' => 'su-ang-6eme', 'code' => 'ANG', 'name' => 'Anglais', 'coefficient' => 2],
            ['id' => 'su-svt-6eme', 'code' => 'SVT', 'name' => 'SVT', 'coefficient' => 2],
            ['id' => 'su-eps-6eme', 'code' => 'EPS', 'name' => 'EPS', 'coefficient' => 1],
        ];

        foreach ($extras as $subject) {
            Subject::query()->updateOrCreate(
                ['id' => $subject['id']],
                [
                    'code' => $subject['code'],
                    'name' => $subject['name'],
                    'textbook' => null,
                    'coefficient' => $subject['coefficient'],
                    'cycle' => 'college',
                    'grade_level_id' => 'gl-6eme',
                    'track_id' => null,
                    'school_id' => $schoolId,
                ],
            );
        }
    }

    /**
     * @return \Illuminate\Support\Collection<int, Subject>
     */
    private function subjectsForClassroom(Classroom $classroom)
    {
        return Subject::query()
            ->where('cycle', $classroom->cycle->value)
            ->where(function ($query) use ($classroom): void {
                $query->where('grade_level_id', $classroom->grade_level_id)
                    ->orWhereNull('grade_level_id');
            })
            ->where(function ($query) use ($classroom): void {
                $query->whereNull('track_id');

                if ($classroom->track_id !== null) {
                    $query->orWhere('track_id', $classroom->track_id);
                }
            })
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Subject>  $subjects
     * @param  \Illuminate\Support\Collection<int, Enrollment>  $enrollments
     * @return array{0: int, 1: int}
     */
    private function seedClassroomTerm(
        string $schoolId,
        Classroom $classroom,
        Term $term,
        $subjects,
        $enrollments,
    ): array {
        $plans = [
            [
                'type' => AssessmentType::Devoir,
                'suffix' => 'd1',
                'name' => 'Devoir 1',
                'day' => '2026-10-08',
                'from' => '08:00',
                'to' => '09:00',
            ],
            [
                'type' => AssessmentType::Devoir,
                'suffix' => 'd2',
                'name' => 'Devoir 2',
                'day' => '2026-11-12',
                'from' => '08:00',
                'to' => '09:00',
            ],
            [
                'type' => AssessmentType::Composition,
                'suffix' => 'c1',
                'name' => 'Composition T1',
                'day' => '2026-12-02',
                'from' => '08:00',
                'to' => '10:00',
            ],
        ];

        $assessmentCount = 0;
        $gradeCount = 0;

        foreach ($subjects as $subjectIndex => $subject) {
            foreach ($plans as $planIndex => $plan) {
                $assessmentId = sprintf(
                    'as-bul-%s-%s-%s',
                    $classroom->id,
                    $plan['suffix'],
                    $subject->id,
                );

                Assessment::query()->updateOrCreate(
                    ['id' => $assessmentId],
                    [
                        'type' => $plan['type']->value,
                        'name' => $plan['name'].' - '.$subject->name,
                        'classroom_id' => $classroom->id,
                        'subject_id' => $subject->id,
                        'term_id' => $term->id,
                        'held_on' => $plan['day'],
                        'held_at' => $plan['from'],
                        'held_until' => $plan['to'],
                        'school_id' => $schoolId,
                    ],
                );
                $assessmentCount++;

                foreach ($enrollments as $enrollmentIndex => $enrollment) {
                    $score = $this->scoreFor(
                        $enrollmentIndex,
                        $subjectIndex,
                        $planIndex,
                    );

                    Grade::query()->updateOrCreate(
                        [
                            'enrollment_id' => $enrollment->id,
                            'assessment_id' => $assessmentId,
                            'subject_id' => $subject->id,
                        ],
                        [
                            'id' => sprintf(
                                'gr-bul-%s-%s-%s',
                                $enrollment->id,
                                $plan['suffix'],
                                $subject->id,
                            ),
                            'score' => $score,
                            'school_id' => $schoolId,
                        ],
                    );
                    $gradeCount++;
                }
            }
        }

        return [$assessmentCount, $gradeCount];
    }

    private function scoreFor(int $enrollmentIndex, int $subjectIndex, int $planIndex): float
    {
        $base = 9.5 + ($enrollmentIndex % 7) * 0.8 + ($subjectIndex % 4) * 0.4 + $planIndex * 0.3;

        return round(min(19.5, max(6.0, $base)), 2);
    }
}
