<?php

use App\Models\AttendanceMark;
use App\Models\AttendanceSession;
use App\Models\Enrollment;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Support\School\SchoolClock;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-10 07:45:00', SchoolClock::timezone()));
});

afterEach(function () {
    Carbon::setTestNow();
});

function fakeSignature(): string
{
    return 'data:image/png;base64,'.str_repeat('A', 40);
}

function makeCe1SlotForBakayoko(): TimetableSlot
{
    return TimetableSlot::query()->create([
        'id' => 'ts-att-session-1',
        'academic_year_id' => 'year-2026',
        'classroom_id' => 'cr-ce1',
        'weekday' => 'jeudi',
        'period_id' => 'p1',
        'subject_id' => 'su-math-ce1',
        'teacher_id' => Teacher::query()->where('email', 's.bakayoko@palmiers.cg')->value('id'),
        'room' => null,
    ]);
}

test('enseignant cannot mark students without signature session', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $slot = makeCe1SlotForBakayoko();
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $this->putJson('/api/v1/attendance', [
        'date' => SchoolClock::today(),
        'classroomId' => 'cr-ce1',
        'slotId' => $slot->id,
        'marks' => [
            [
                'enrollmentId' => $enrollment->id,
                'status' => 'present',
                'periodId' => 'p1',
                'subjectId' => $slot->subject_id,
            ],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['signature']);
});

test('enseignant can sign then mark students during slot window', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $slot = makeCe1SlotForBakayoko();
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();
    $teacher = Teacher::query()->where('email', 's.bakayoko@palmiers.cg')->firstOrFail();

    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $this->postJson('/api/v1/staff-attendance/sign', [
        'date' => SchoolClock::today(),
        'slotId' => $slot->id,
        'signatureData' => fakeSignature(),
        'status' => 'present',
    ])->assertOk()
        ->assertJsonPath('data.teacherId', $teacher->id)
        ->assertJsonPath('data.slotId', $slot->id);

    expect(AttendanceSession::query()->where('slot_id', $slot->id)->count())->toBe(1);

    $this->putJson('/api/v1/attendance', [
        'date' => SchoolClock::today(),
        'classroomId' => 'cr-ce1',
        'slotId' => $slot->id,
        'marks' => [
            [
                'enrollmentId' => $enrollment->id,
                'status' => 'present',
                'periodId' => 'p1',
                'subjectId' => $slot->subject_id,
            ],
        ],
    ])->assertOk()
        ->assertJsonPath('data.0.status', 'present');

    expect(AttendanceMark::query()->where('slot_id', $slot->id)->count())->toBe(1);
});

test('enseignant cannot mark outside the period window', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    Carbon::setTestNow(Carbon::parse('2026-09-10 10:15:00', SchoolClock::timezone()));

    $slot = makeCe1SlotForBakayoko();
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $this->postJson('/api/v1/staff-attendance/sign', [
        'date' => SchoolClock::today(),
        'slotId' => $slot->id,
        'signatureData' => fakeSignature(),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['slotId']);

    AttendanceSession::query()->create([
        'id' => 'ats-test-outside',
        'teacher_id' => $slot->teacher_id,
        'date' => SchoolClock::today(),
        'slot_id' => $slot->id,
        'status' => 'present',
        'signature_data' => fakeSignature(),
        'signed_at' => SchoolClock::now(),
    ]);

    $this->putJson('/api/v1/attendance', [
        'date' => SchoolClock::today(),
        'classroomId' => 'cr-ce1',
        'slotId' => $slot->id,
        'marks' => [
            [
                'enrollmentId' => $enrollment->id,
                'status' => 'absent',
            ],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['slotId']);
});

test('admin can mark past dates without signature', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $slot = makeCe1SlotForBakayoko();
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $this->putJson('/api/v1/attendance', [
        'date' => '2026-09-08',
        'classroomId' => 'cr-ce1',
        'slotId' => $slot->id,
        'marks' => [
            [
                'enrollmentId' => $enrollment->id,
                'status' => 'present',
                'periodId' => 'p1',
                'subjectId' => $slot->subject_id,
            ],
        ],
    ])->assertOk()
        ->assertJsonPath('data.0.status', 'present');
});

test('enseignant sessions index only returns own sessions', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $slot = makeCe1SlotForBakayoko();
    $otherTeacher = Teacher::query()->where('email', '!=', 's.bakayoko@palmiers.cg')->firstOrFail();

    AttendanceSession::query()->create([
        'id' => 'ats-own',
        'teacher_id' => $slot->teacher_id,
        'date' => SchoolClock::today(),
        'slot_id' => $slot->id,
        'status' => 'present',
        'signature_data' => fakeSignature(),
        'signed_at' => SchoolClock::now(),
    ]);

    $otherSlot = TimetableSlot::query()->create([
        'id' => 'ts-att-other',
        'academic_year_id' => 'year-2026',
        'classroom_id' => 'cr-ce1',
        'weekday' => 'vendredi',
        'period_id' => 'p2',
        'subject_id' => $slot->subject_id,
        'teacher_id' => $otherTeacher->id,
        'room' => null,
    ]);

    AttendanceSession::query()->create([
        'id' => 'ats-other',
        'teacher_id' => $otherTeacher->id,
        'date' => SchoolClock::today(),
        'slot_id' => $otherSlot->id,
        'status' => 'present',
        'signature_data' => fakeSignature(),
        'signed_at' => SchoolClock::now(),
    ]);

    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $this->getJson('/api/v1/staff-attendance/sessions?date='.SchoolClock::today())
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', 'ats-own');
});
