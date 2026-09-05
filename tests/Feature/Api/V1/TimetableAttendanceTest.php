<?php

use App\Models\AttendanceMark;
use App\Models\Enrollment;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('secretaire cannot manage timetable or attendance', function () {
    $this->actingAs(User::factory()->secretaire()->create());

    $this->getJson('/api/v1/timetable-slots')->assertForbidden();
    $this->getJson('/api/v1/attendance')->assertForbidden();
});

test('timetable rejects classroom and teacher conflicts at the same period', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $teacherA = Teacher::query()->firstOrFail();
    $teacherB = Teacher::query()->where('id', '!=', $teacherA->id)->firstOrFail();
    $subject = Subject::query()->where('grade_level_id', 'gl-ce1')->firstOrFail();

    $this->postJson('/api/v1/timetable-slots', [
        'academicYearId' => 'year-2026',
        'classroomId' => 'cr-ce1',
        'weekday' => 'lundi',
        'periodId' => 'p1',
        'subjectId' => $subject->id,
        'teacherId' => $teacherA->id,
        'room' => 'Salle 3',
    ])->assertCreated();

    $this->postJson('/api/v1/timetable-slots', [
        'academicYearId' => 'year-2026',
        'classroomId' => 'cr-ce1',
        'weekday' => 'lundi',
        'periodId' => 'p1',
        'subjectId' => $subject->id,
        'teacherId' => $teacherB->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['periodId']);

    $this->postJson('/api/v1/timetable-slots', [
        'academicYearId' => 'year-2026',
        'classroomId' => 'cr-cm2',
        'weekday' => 'lundi',
        'periodId' => 'p1',
        'subjectId' => Subject::query()->where('grade_level_id', 'gl-cm2')->value('id'),
        'teacherId' => $teacherA->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['teacherId']);
});

test('attendance bulk upsert supports excuse note and document', function () {
    Storage::fake('public');
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();
    $slot = TimetableSlot::query()->create([
        'id' => 'ts-test-1',
        'academic_year_id' => 'year-2026',
        'classroom_id' => 'cr-ce1',
        'weekday' => 'mardi',
        'period_id' => 'p2',
        'subject_id' => Subject::query()->where('grade_level_id', 'gl-ce1')->value('id'),
        'teacher_id' => Teacher::query()->value('id'),
        'room' => null,
    ]);

    $this->put('/api/v1/attendance', [
        'date' => '2026-09-08',
        'classroomId' => 'cr-ce1',
        'slotId' => $slot->id,
        'marks' => [
            [
                'enrollmentId' => $enrollment->id,
                'status' => 'excuse',
                'periodId' => 'p2',
                'subjectId' => $slot->subject_id,
                'note' => 'Certificat médical',
                'document' => UploadedFile::fake()->create('certificat.pdf', 200, 'application/pdf'),
            ],
        ],
    ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'excuse')
        ->assertJsonPath('data.0.note', 'Certificat médical');

    $mark = AttendanceMark::query()->where('enrollment_id', $enrollment->id)->whereDate('date', '2026-09-08')->first();

    expect($mark)->not->toBeNull()
        ->and($mark->document_url)->not->toBeNull()
        ->and($mark->document_name)->toBe('certificat.pdf');

    $this->putJson('/api/v1/attendance', [
        'date' => '2026-09-08',
        'classroomId' => 'cr-ce1',
        'slotId' => $slot->id,
        'marks' => [
            [
                'enrollmentId' => $enrollment->id,
                'status' => 'excuse',
                'periodId' => 'p2',
                'note' => null,
            ],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['marks.0.note']);
});
