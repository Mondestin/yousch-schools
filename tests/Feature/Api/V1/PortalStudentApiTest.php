<?php

use App\Enums\AnnouncementAudience;
use App\Enums\AssessmentType;
use App\Enums\AttendanceStatus;
use App\Enums\StaffRole;
use App\Enums\Weekday;
use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\AttendanceMark;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\MarkingWindow;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Support\Auth\StaffAccess;
use Database\Seeders\PortalDemoSeeder;
use Database\Seeders\SchoolBulletinsSeeder;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Str;

test('portal ability is granted to eleve and parent only', function () {
    expect(StaffAccess::can(StaffRole::Eleve, 'portal'))->toBeTrue()
        ->and(StaffAccess::can(StaffRole::Parent, 'portal'))->toBeTrue()
        ->and(StaffAccess::can(StaffRole::Admin, 'portal'))->toBeFalse()
        ->and(StaffAccess::can(StaffRole::Secretaire, 'students'))->toBeTrue();
});

test('eleve profile includes student card info and color theme', function () {
    $this->seed(SchoolTaxonomySeeder::class);

    SchoolProfile::query()->update([
        'id_card_accent' => '#fd7302',
        'id_card_body' => '#fff8f0',
        'motto' => 'Savoir et discipline',
    ]);

    $pupil = User::factory()->eleve()->create();
    $student = Student::factory()->create([
        'user_id' => $pupil->id,
        'first_name' => 'Rokia',
        'last_name' => 'Cissé',
        'email' => $pupil->email,
        'phone' => '0611223344',
        'matricule' => 'MAT-4242',
    ]);

    $classroom = Classroom::query()->where('cycle', 'college')->firstOrFail();

    Enrollment::factory()->create([
        'student_id' => $student->id,
        'classroom_id' => $classroom->id,
        'academic_year_id' => $classroom->academic_year_id,
        'track_id' => $classroom->track_id,
    ]);

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/profile')
        ->assertOk()
        ->assertJsonPath('theme.accent', '#fd7302')
        ->assertJsonPath('theme.body', '#fff8f0')
        ->assertJsonPath('data.card.kind', 'student')
        ->assertJsonPath('data.card.orientation', 'horizontal')
        ->assertJsonPath('data.card.theme.accent', '#fd7302')
        ->assertJsonPath('data.card.person.name', 'Rokia Cissé')
        ->assertJsonPath('data.card.person.fields.matricule', 'MAT-4242')
        ->assertJsonPath('data.card.person.fields.phone', '0611223344')
        ->assertJsonPath('data.card.person.fields.classroom', $classroom->name)
        ->assertJsonPath('data.card.school.motto', 'Savoir et discipline')
        ->assertJsonPath('schoolProfile.idCardAccent', '#fd7302');

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/me')
        ->assertOk()
        ->assertJsonPath('theme.accent', '#fd7302')
        ->assertJsonPath('students.0.card.person.fields.matricule', 'MAT-4242');
});

test('eleve can read planning notes and presences', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $pupil = User::factory()->eleve()->create();
    $student = Student::factory()->create(['user_id' => $pupil->id]);
    $classroom = Classroom::query()->where('id', 'cr-ce1')->firstOrFail();
    $subject = Subject::query()->where('grade_level_id', 'gl-ce1')->firstOrFail();
    $teacher = Teacher::query()->firstOrFail();
    $termId = (string) \App\Models\Term::query()->value('id');

    $enrollment = Enrollment::factory()->create([
        'student_id' => $student->id,
        'classroom_id' => $classroom->id,
        'academic_year_id' => $classroom->academic_year_id,
        'track_id' => $classroom->track_id,
    ]);

    TimetableSlot::query()->create([
        'id' => 'ts-'.Str::lower((string) Str::ulid()),
        'academic_year_id' => $classroom->academic_year_id,
        'classroom_id' => $classroom->id,
        'weekday' => Weekday::Lundi->value,
        'period_id' => 'p1',
        'subject_id' => $subject->id,
        'teacher_id' => $teacher->id,
        'room' => 'A1',
    ]);

    $assessment = Assessment::query()->create([
        'id' => 'as-'.Str::lower((string) Str::ulid()),
        'type' => AssessmentType::Devoir->value,
        'name' => 'Devoir 1',
        'classroom_id' => $classroom->id,
        'subject_id' => $subject->id,
        'term_id' => $termId,
        'held_on' => now()->toDateString(),
        'held_at' => '08:00',
        'held_until' => '10:00',
    ]);

    Grade::query()->create([
        'id' => 'gr-'.Str::lower((string) Str::ulid()),
        'enrollment_id' => $enrollment->id,
        'assessment_id' => $assessment->id,
        'subject_id' => $subject->id,
        'score' => 14.5,
    ]);

    AttendanceMark::query()->create([
        'id' => 'am-'.Str::lower((string) Str::ulid()),
        'enrollment_id' => $enrollment->id,
        'date' => now()->toDateString(),
        'status' => AttendanceStatus::Present->value,
        'subject_id' => $subject->id,
        'period_id' => 'p1',
    ]);

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/planning')
        ->assertOk()
        ->assertJsonPath('classroomId', $classroom->id)
        ->assertJsonPath('data.0.subjectName', $subject->name)
        ->assertJsonPath('data.0.teacherName', trim($teacher->first_name.' '.$teacher->last_name));

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/notes')
        ->assertOk()
        ->assertJsonPath('data.0.score', 14.5)
        ->assertJsonPath('data.0.subjectName', $subject->name)
        ->assertJsonPath('data.0.assessmentName', 'Devoir 1');

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/presences')
        ->assertOk()
        ->assertJsonPath('data.0.status', 'present')
        ->assertJsonPath('data.0.subjectName', $subject->name);

    // English aliases
    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/timetable')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/grades')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.$student->id.'/attendance')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('parent can read linked children but not unrelated students', function () {
    $parentUser = User::factory()->parent()->create();
    $guardian = Guardian::factory()->create([
        'user_id' => $parentUser->id,
        'email' => $parentUser->email,
    ]);

    $child = Student::factory()->create(['first_name' => 'Awa']);
    $other = Student::factory()->create(['first_name' => 'Autre']);

    $guardian->students()->attach($child->id, ['relation' => 'mere']);

    $this->actingAs($parentUser)
        ->getJson('/api/v1/portal/students')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $child->id);

    $this->actingAs($parentUser)
        ->getJson('/api/v1/portal/students/'.$child->id.'/profile')
        ->assertOk()
        ->assertJsonPath('data.card.person.name', fn (string $name): bool => str_contains($name, 'Awa'));

    $this->actingAs($parentUser)
        ->getJson('/api/v1/portal/students/'.$other->id.'/profile')
        ->assertNotFound();
});

test('staff cannot use portal student routes', function () {
    $admin = User::factory()->admin()->create();
    $student = Student::factory()->create();

    $this->actingAs($admin)
        ->getJson('/api/v1/portal/students')
        ->assertForbidden();

    $this->actingAs($admin)
        ->getJson('/api/v1/portal/students/'.$student->id.'/profile')
        ->assertForbidden();
});

test('eleve can list portal announcements for pupils', function () {
    $pupil = User::factory()->eleve()->create();
    Student::factory()->create(['user_id' => $pupil->id]);

    Announcement::query()->create([
        'id' => 'an-eleves',
        'title' => 'Conseil de classe',
        'body' => 'Présence obligatoire.',
        'audience' => AnnouncementAudience::Eleves,
        'published_on' => now()->toDateString(),
    ]);

    Announcement::query()->create([
        'id' => 'an-parents',
        'title' => 'Réunion parents',
        'body' => 'Réservé aux parents.',
        'audience' => AnnouncementAudience::Parents,
        'published_on' => now()->toDateString(),
    ]);

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/announcements')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', 'an-eleves');
});

test('eleve cannot use staff students management routes', function () {
    $pupil = User::factory()->eleve()->create();
    Student::factory()->create(['user_id' => $pupil->id]);

    $this->actingAs($pupil)
        ->getJson('/api/v1/students')
        ->assertForbidden();
});

test('portal demo seeder enables bulletin preview with closed windows', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->seed(PortalDemoSeeder::class);

    $pupil = User::query()->where('email', PortalDemoSeeder::ELEVE_EMAIL)->firstOrFail();
    $student = Student::query()->findOrFail(PortalDemoSeeder::STUDENT_ID);

    expect($student->photo_url)->toContain('dicebear.com')
        ->and(MarkingWindow::query()->where('term_id', PortalDemoSeeder::TERM_ID)->whereNotNull('closed_at')->count())->toBeGreaterThanOrEqual(2)
        ->and(Grade::query()->where('enrollment_id', PortalDemoSeeder::ENROLLMENT_ID)->count())->toBeGreaterThanOrEqual(2);

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.PortalDemoSeeder::STUDENT_ID.'/notes')
        ->assertOk()
        ->assertJsonPath('data.0.subjectName', fn ($v) => is_string($v) && $v !== '');

    $this->actingAs($pupil)
        ->getJson('/api/v1/portal/students/'.PortalDemoSeeder::STUDENT_ID.'/bulletin?termId='.PortalDemoSeeder::TERM_ID)
        ->assertOk()
        ->assertJsonPath('data.name', fn ($v) => is_string($v))
        ->assertJsonStructure([
            'data' => [
                'lines',
                'average',
                'rank',
                'classSize',
                'mention',
            ],
        ]);
});

test('school bulletins seeder unlocks staff bulletin preview for enrolled pupils', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->seed(PortalDemoSeeder::class);
    $this->seed(SchoolBulletinsSeeder::class);

    $staff = User::factory()->directeur()->create();
    $studentId = Enrollment::query()
        ->where('status', 'inscrit')
        ->where('classroom_id', 'cr-6eme')
        ->value('student_id');

    expect($studentId)->toBeString()
        ->and(MarkingWindow::query()->where('term_id', SchoolBulletinsSeeder::TERM_ID)->whereNotNull('closed_at')->count())->toBeGreaterThanOrEqual(2);

    $this->actingAs($staff)
        ->getJson('/api/v1/students/'.$studentId.'/bulletin?termId='.SchoolBulletinsSeeder::TERM_ID)
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'lines',
                'average',
                'rank',
                'classSize',
                'mention',
                'result',
            ],
        ])
        ->assertJsonPath('data.lines', fn ($lines) => is_array($lines) && count($lines) >= 2);
});
