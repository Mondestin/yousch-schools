<?php

namespace Database\Seeders;

use App\Enums\AnnouncementAudience;
use App\Enums\AssessmentType;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StaffRole;
use App\Enums\Weekday;
use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\AttendanceMark;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\IdentityCard;
use App\Models\MarkingWindow;
use App\Models\Payment;
use App\Models\Sanction;
use App\Models\School;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\Term;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Deterministic élève / parent accounts + rich portal data for local testing.
 *
 * Password for both: `password`
 *
 * Photos use stable Dicebear URLs (same seed → same image forever).
 */
class PortalDemoSeeder extends Seeder
{
    public const ELEVE_EMAIL = 'eleve@palmiers.cg';

    public const PARENT_EMAIL = 'parent@palmiers.cg';

    public const PASSWORD = 'password';

    public const STUDENT_ID = 'st-demo-portal';

    public const ENROLLMENT_ID = 'en-demo-portal';

    public const CLASSROOM_ID = 'cr-6eme';

    public const TERM_ID = 'term-2026-1';

    public function run(): void
    {
        if (CurrentSchool::get() === null) {
            $school = School::query()->where('domain', 'palmiers')->first()
                ?? School::query()->first();

            if ($school === null) {
                $this->command?->warn('PortalDemoSeeder: no school found — skip.');

                return;
            }

            CurrentSchool::set($school);
        }

        $schoolId = CurrentSchool::require()->id;

        $classroom = Classroom::query()->find(self::CLASSROOM_ID)
            ?? Classroom::query()->where('cycle', 'college')->orderBy('id')->first()
            ?? Classroom::query()->orderBy('id')->first();

        if ($classroom === null) {
            $this->command?->warn('PortalDemoSeeder: no classroom found — skip.');

            return;
        }

        $this->seedAccountsAndStudent($schoolId, $classroom);
        $this->seedStablePhotos($schoolId);
        $this->seedClosedMarkingWindows($schoolId);
        $this->seedAssessmentsGradesAndBulletin($schoolId, $classroom);
        $this->seedPlanningAttendancePayments($schoolId, $classroom);
        $this->seedOfficeExtras($schoolId);

        $this->command?->info('Portal demo ready:');
        $this->command?->line('  Élève     '.self::ELEVE_EMAIL.' / '.self::PASSWORD);
        $this->command?->line('  Parent    '.self::PARENT_EMAIL.' / '.self::PASSWORD);
        $this->command?->line('  Domain    palmiers');
        $this->command?->line('  Student   '.self::STUDENT_ID);
        $this->command?->line('  Bulletin  GET /portal/students/'.self::STUDENT_ID.'/bulletin?termId='.self::TERM_ID);
    }

    /**
     * Demo-only synthetic ID photos from /public/demo/student-id (no real kids, no reuse).
     */
    private function seedStablePhotos(string $schoolId): void
    {
        SchoolProfile::query()
            ->where('school_id', $schoolId)
            ->update([
                'logo_url' => $this->schoolLogoUrl(),
                'id_card_accent' => '#6425d0',
                'id_card_body' => '#ffffff',
            ]);

        $girlSamples = $this->demoIdPhotoFiles(preferGirl: true);
        $boySamples = $this->demoIdPhotoFiles(preferGirl: false);

        // Demo pupil first, then others — each sample file used at most once.
        $students = Student::query()
            ->orderByRaw('case when id = ? then 0 else 1 end', [self::STUDENT_ID])
            ->orderBy('id')
            ->get();

        foreach ($students as $student) {
            if ($this->shouldKeepUploadedPhoto($student->photo_url)) {
                continue;
            }

            $preferGirl = $student->gender === Gender::Femme;
            $url = null;

            if ($preferGirl && $girlSamples !== []) {
                $url = array_shift($girlSamples);
            } elseif (! $preferGirl && $boySamples !== []) {
                $url = array_shift($boySamples);
            } elseif ($girlSamples !== []) {
                $url = array_shift($girlSamples);
            } elseif ($boySamples !== []) {
                $url = array_shift($boySamples);
            }

            // No sample left → clear stock/remote photos (do not reuse).
            $student->forceFill(['photo_url' => $url])->saveQuietly();
        }

        Teacher::query()->orderBy('id')->each(function (Teacher $teacher): void {
            if ($this->shouldKeepUploadedPhoto($teacher->photo_url)) {
                return;
            }

            // Teachers: no demo kid samples; clear remote stock portraits.
            if ($this->isRemoteStockPhoto($teacher->photo_url)) {
                $teacher->forceFill(['photo_url' => null])->saveQuietly();
            }
        });

        User::query()
            ->where('school_id', $schoolId)
            ->orderBy('id')
            ->each(function (User $user): void {
                if ($this->shouldKeepUploadedPhoto($user->avatar_url)) {
                    return;
                }

                if ($this->isRemoteStockPhoto($user->avatar_url)) {
                    $user->forceFill(['avatar_url' => null])->saveQuietly();
                }
            });

        $demoStudent = Student::query()->find(self::STUDENT_ID);
        if ($demoStudent?->user_id && $demoStudent->photo_url) {
            User::query()
                ->where('id', $demoStudent->user_id)
                ->update(['avatar_url' => $demoStudent->photo_url]);
        }
    }

    /**
     * @return list<string> Public URLs under /demo/student-id
     */
    private function demoIdPhotoFiles(bool $preferGirl): array
    {
        $dir = public_path('demo/student-id');
        if (! is_dir($dir)) {
            return [];
        }

        // Odd files = girl samples, even = boy samples (generation order).
        $wantOdd = $preferGirl;
        $files = collect(scandir($dir) ?: [])
            ->filter(fn (string $name): bool => (bool) preg_match('/^\d{2}\.jpg$/', $name))
            ->sort()
            ->values()
            ->all();

        $urls = [];
        foreach ($files as $name) {
            $n = (int) substr($name, 0, 2);
            $isOdd = $n % 2 === 1;
            if ($isOdd === $wantOdd) {
                $urls[] = '/demo/student-id/'.$name;
            }
        }

        return $urls;
    }

    private function shouldKeepUploadedPhoto(?string $url): bool
    {
        if ($url === null || trim($url) === '') {
            return false;
        }

        return str_contains($url, '/storage/')
            || str_contains($url, 'students/photos')
            || str_contains($url, 'staff/avatars');
    }

    private function isRemoteStockPhoto(?string $url): bool
    {
        if ($url === null || trim($url) === '') {
            return false;
        }

        return str_contains($url, 'dicebear.com')
            || str_contains($url, 'unsplash.com')
            || str_contains($url, 'randomuser.me')
            || str_contains($url, 'pravatar.cc');
    }

    private function seedAccountsAndStudent(string $schoolId, Classroom $classroom): void
    {
        $eleve = User::query()->updateOrCreate(
            [
                'school_id' => $schoolId,
                'email' => self::ELEVE_EMAIL,
            ],
            [
                'name' => 'Awa Demo Élève',
                'phone' => '06 000 11 22',
                'role' => StaffRole::Eleve,
                'cycles' => [],
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
                'blocked_at' => null,
            ],
        );

        $parent = User::query()->updateOrCreate(
            [
                'school_id' => $schoolId,
                'email' => self::PARENT_EMAIL,
            ],
            [
                'name' => 'Marie Demo Parent',
                'phone' => '06 000 33 44',
                'role' => StaffRole::Parent,
                'cycles' => [],
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
                'blocked_at' => null,
            ],
        );

        $student = Student::query()->updateOrCreate(
            ['id' => self::STUDENT_ID],
            [
                'matricule' => 'MAT-DEMO-01',
                'first_name' => 'Awa',
                'last_name' => 'Demo',
                'gender' => Gender::Femme,
                'born_on' => '2012-05-14',
                'city' => 'Brazzaville',
                'neighborhood' => 'Moungali',
                'address' => 'Avenue de la Paix',
                'phone' => '06 000 11 22',
                'email' => self::ELEVE_EMAIL,
                'enrolled_on' => '2026-09-02',
                'user_id' => $eleve->id,
                'school_id' => $schoolId,
            ],
        );

        Enrollment::query()->updateOrCreate(
            ['id' => self::ENROLLMENT_ID],
            [
                'student_id' => $student->id,
                'classroom_id' => $classroom->id,
                'academic_year_id' => $classroom->academic_year_id,
                'track_id' => $classroom->track_id,
                'status' => EnrollmentStatus::Inscrit,
                'school_id' => $schoolId,
            ],
        );

        $guardian = Guardian::query()->updateOrCreate(
            ['id' => 'gu-demo-portal'],
            [
                'first_name' => 'Marie',
                'last_name' => 'Demo',
                'phone' => '06 000 33 44',
                'profession' => 'Commerçante',
                'gender' => Gender::Femme,
                'email' => self::PARENT_EMAIL,
                'city' => 'Brazzaville',
                'neighborhood' => 'Moungali',
                'address' => 'Avenue de la Paix',
                'user_id' => $parent->id,
                'school_id' => $schoolId,
            ],
        );

        $guardian->students()->syncWithoutDetaching([
            $student->id => ['relation' => GuardianRelation::Mere->value],
        ]);

        IdentityCard::query()->updateOrCreate(
            [
                'subject_type' => IdentityCard::SUBJECT_STUDENT,
                'subject_id' => $student->id,
            ],
            [
                'school_id' => $schoolId,
                'status' => IdentityCard::STATUS_ACTIVE,
                'printed_at' => now()->subDays(10),
            ],
        );
    }

    private function seedClosedMarkingWindows(string $schoolId): void
    {
        $terms = Term::query()
            ->where('academic_year_id', 'year-2026')
            ->orderBy('id')
            ->get();

        foreach ($terms as $term) {
            foreach ([AssessmentType::Devoir, AssessmentType::Composition] as $type) {
                MarkingWindow::query()->updateOrCreate(
                    [
                        'school_id' => $schoolId,
                        'term_id' => $term->id,
                        'type' => $type->value,
                    ],
                    [
                        'id' => 'mw-'.$term->id.'-'.$type->value,
                        'opens_on' => $term->starts_on?->format('Y-m-d') ?? '2026-09-01',
                        'closes_on' => $term->ends_on?->format('Y-m-d') ?? '2026-12-18',
                        // Closed so bulletins can be previewed.
                        'closed_at' => now()->subDay(),
                        'opened_notified_at' => now()->subWeeks(6),
                        'closing_reminder_sent_at' => now()->subDays(3),
                    ],
                );
            }
        }
    }

    private function seedAssessmentsGradesAndBulletin(string $schoolId, Classroom $classroom): void
    {
        $subjects = Subject::query()
            ->where('cycle', $classroom->cycle)
            ->where(function ($query) use ($classroom): void {
                $query->where('grade_level_id', $classroom->grade_level_id)
                    ->orWhereNull('grade_level_id');
            })
            ->orderBy('name')
            ->get();

        if ($subjects->isEmpty()) {
            $subjects = Subject::query()
                ->where('grade_level_id', $classroom->grade_level_id)
                ->orderBy('name')
                ->get();
        }

        if ($subjects->isEmpty()) {
            $this->command?->warn('PortalDemoSeeder: no subjects for classroom — skip grades.');

            return;
        }

        $termId = self::TERM_ID;
        $heldPlans = [
            AssessmentType::Devoir->value => [
                ['suffix' => 'd1', 'name' => 'Devoir 1', 'day' => '2026-10-08', 'from' => '08:00', 'to' => '09:00'],
                ['suffix' => 'd2', 'name' => 'Devoir 2', 'day' => '2026-11-12', 'from' => '08:00', 'to' => '09:00'],
            ],
            AssessmentType::Composition->value => [
                ['suffix' => 'c1', 'name' => 'Composition T1', 'day' => '2026-12-02', 'from' => '08:00', 'to' => '10:00'],
            ],
        ];

        $scoreBase = [
            'su-math-6eme' => [12.5, 14.0, 11.0],
            'su-fra-6eme' => [13.0, 15.5, 12.5],
        ];

        foreach ($subjects as $index => $subject) {
            $scores = $scoreBase[$subject->id] ?? [
                10 + ($index % 5) + 0.5,
                11 + ($index % 4),
                12 + ($index % 3) + 0.5,
            ];
            $scoreCursor = 0;

            foreach ($heldPlans as $type => $plans) {
                foreach ($plans as $plan) {
                    $assessmentId = 'as-demo-'.$plan['suffix'].'-'.$subject->id;

                    Assessment::query()->updateOrCreate(
                        ['id' => $assessmentId],
                        [
                            'type' => $type,
                            'name' => $plan['name'].' - '.$subject->name,
                            'classroom_id' => $classroom->id,
                            'subject_id' => $subject->id,
                            'term_id' => $termId,
                            'held_on' => $plan['day'],
                            'held_at' => $plan['from'],
                            'held_until' => $plan['to'],
                            'school_id' => $schoolId,
                        ],
                    );

                    $score = $scores[$scoreCursor] ?? 12.0;
                    $scoreCursor++;

                    Grade::query()->updateOrCreate(
                        [
                            'enrollment_id' => self::ENROLLMENT_ID,
                            'assessment_id' => $assessmentId,
                            'subject_id' => $subject->id,
                        ],
                        [
                            'id' => 'gr-demo-'.$plan['suffix'].'-'.$subject->id,
                            'score' => $score,
                            'school_id' => $schoolId,
                        ],
                    );
                }
            }
        }

        // Ensure classmates with existing fixture grades also have both types on math.
        $classmateEnrollment = Enrollment::query()
            ->where('classroom_id', $classroom->id)
            ->where('id', '!=', self::ENROLLMENT_ID)
            ->orderBy('id')
            ->first();

        if ($classmateEnrollment !== null && $subjects->firstWhere('id', 'su-math-6eme') !== null) {
            foreach (['as-1' => 12.0, 'as-4' => 11.0] as $assessmentId => $score) {
                if (! Assessment::query()->whereKey($assessmentId)->exists()) {
                    continue;
                }

                Grade::query()->updateOrCreate(
                    [
                        'enrollment_id' => $classmateEnrollment->id,
                        'assessment_id' => $assessmentId,
                        'subject_id' => 'su-math-6eme',
                    ],
                    [
                        'id' => 'gr-demo-class-'.$assessmentId,
                        'score' => $score,
                        'school_id' => $schoolId,
                    ],
                );
            }
        }
    }

    private function seedPlanningAttendancePayments(string $schoolId, Classroom $classroom): void
    {
        $subjects = Subject::query()
            ->where('grade_level_id', $classroom->grade_level_id)
            ->orderBy('name')
            ->get();
        $teacher = Teacher::query()->orderBy('id')->first();

        if ($teacher === null || $subjects->isEmpty()) {
            return;
        }

        $weekdays = [Weekday::Lundi, Weekday::Mardi, Weekday::Mercredi, Weekday::Jeudi, Weekday::Vendredi];
        $periods = ['p1', 'p2', 'p3', 'p4'];

        foreach ($weekdays as $dayIndex => $weekday) {
            $subject = $subjects[$dayIndex % $subjects->count()];
            $period = $periods[$dayIndex % count($periods)];
            $slotId = 'ts-demo-'.$weekday->value.'-'.$period;

            TimetableSlot::query()->updateOrCreate(
                [
                    'classroom_id' => $classroom->id,
                    'weekday' => $weekday->value,
                    'period_id' => $period,
                ],
                [
                    'id' => $slotId,
                    'academic_year_id' => $classroom->academic_year_id,
                    'subject_id' => $subject->id,
                    'teacher_id' => $teacher->id,
                    'room' => 'Salle '.($dayIndex + 1),
                    'school_id' => $schoolId,
                ],
            );

            AttendanceMark::query()->updateOrCreate(
                [
                    'id' => 'am-demo-'.$weekday->value,
                ],
                [
                    'enrollment_id' => self::ENROLLMENT_ID,
                    'date' => now()->startOfWeek()->addDays($dayIndex)->toDateString(),
                    'status' => $dayIndex === 3
                        ? AttendanceStatus::Retard->value
                        : AttendanceStatus::Present->value,
                    'slot_id' => $slotId,
                    'period_id' => $period,
                    'subject_id' => $subject->id,
                    'note' => $dayIndex === 3 ? 'Arrivée à 08:15' : null,
                    'school_id' => $schoolId,
                ],
            );
        }

        foreach (['2026-09', '2026-10', '2026-11'] as $i => $month) {
            Payment::query()->updateOrCreate(
                [
                    'enrollment_id' => self::ENROLLMENT_ID,
                    'month' => $month,
                ],
                [
                    'id' => 'py-demo-'.$month,
                    'amount' => $i < 2 ? 25000 : 10000,
                    'expected_amount' => 25000,
                    'status' => $i < 2
                        ? PaymentStatus::Paye->value
                        : PaymentStatus::Partiel->value,
                    'paid_on' => $i < 2 ? $month.'-05' : $month.'-08',
                    'method' => PaymentMethod::Especes->value,
                    'school_id' => $schoolId,
                ],
            );
        }
    }

    private function seedOfficeExtras(string $schoolId): void
    {
        Sanction::query()->updateOrCreate(
            ['id' => 'sn-demo-1'],
            [
                'student_id' => self::STUDENT_ID,
                'date' => '2026-10-20',
                'type' => 'avertissement',
                'reason' => 'Retards répétés (démo portail).',
                'school_id' => $schoolId,
            ],
        );

        Announcement::query()->updateOrCreate(
            ['id' => 'an-demo-eleves'],
            [
                'title' => 'Bulletins du 1er trimestre',
                'body' => 'Les bulletins sont disponibles dans votre espace élève.',
                'audience' => AnnouncementAudience::Eleves,
                'published_on' => now()->toDateString(),
                'school_id' => $schoolId,
            ],
        );

        Announcement::query()->updateOrCreate(
            ['id' => 'an-demo-parents'],
            [
                'title' => 'Réunion parents-professeurs',
                'body' => 'Réunion le samedi prochain à 09h00.',
                'audience' => AnnouncementAudience::Parents,
                'published_on' => now()->toDateString(),
                'school_id' => $schoolId,
            ],
        );

        Announcement::query()->updateOrCreate(
            ['id' => 'an-demo-tous'],
            [
                'title' => 'Journée portes ouvertes',
                'body' => 'Toute la communauté scolaire est invitée.',
                'audience' => AnnouncementAudience::Tous,
                'published_on' => now()->subDays(2)->toDateString(),
                'school_id' => $schoolId,
            ],
        );
    }

    private function schoolLogoUrl(): string
    {
        return 'https://images.unsplash.com/photo-1580582932707-520aed937bd7?auto=format&fit=crop&w=320&h=240&q=80';
    }
}
