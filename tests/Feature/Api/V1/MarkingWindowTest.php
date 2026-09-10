<?php

use App\Models\Assessment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\MarkingWindow;
use App\Models\User;
use App\Notifications\MarkingWindowNotification;
use App\Support\Api\ResourceId;
use App\Support\School\SchoolClock;
use Database\Seeders\SchoolGradesSeeder;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-11-10 09:00:00', SchoolClock::timezone()));
});

afterEach(function () {
    Carbon::setTestNow();
});

test('composition grades blocked outside window for enseignant', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    MarkingWindow::query()->create([
        'id' => ResourceId::make('mw'),
        'term_id' => 'term-2026-1',
        'type' => 'composition',
        'opens_on' => '2026-12-01',
        'closes_on' => '2026-12-15',
    ]);

    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $assessment = $this->postJson('/api/v1/assessments', [
        'type' => 'composition',
        'name' => 'Composition Math',
        'classroomId' => 'cr-6eme',
        'subjectId' => 'su-math-6eme',
        'termId' => 'term-2026-1',
        'heldOn' => '2026-11-10',
        'heldAt' => '08:00',
        'heldUntil' => '10:00',
    ])->assertCreated()->json('data');

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-6eme')->firstOrFail();

    $this->putJson('/api/v1/grades', [
        'assessmentId' => $assessment['id'],
        'grades' => [
            ['enrollmentId' => $enrollment->id, 'score' => 12],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['assessmentId']);
});

test('composition grades allowed inside window for enseignant', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    MarkingWindow::query()->create([
        'id' => ResourceId::make('mw'),
        'term_id' => 'term-2026-1',
        'type' => 'composition',
        'opens_on' => '2026-11-01',
        'closes_on' => '2026-11-30',
    ]);

    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $assessment = $this->postJson('/api/v1/assessments', [
        'type' => 'composition',
        'name' => 'Composition Math',
        'classroomId' => 'cr-6eme',
        'subjectId' => 'su-math-6eme',
        'termId' => 'term-2026-1',
        'heldOn' => '2026-11-10',
        'heldAt' => '08:00',
        'heldUntil' => '10:00',
    ])->assertCreated()->json('data');

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-6eme')->firstOrFail();

    $this->putJson('/api/v1/grades', [
        'assessmentId' => $assessment['id'],
        'grades' => [
            ['enrollmentId' => $enrollment->id, 'score' => 13.5],
        ],
    ])->assertOk()
        ->assertJsonPath('data.0.score', 13.5);
});

test('admin can close windows and bulletin requires closed sections plus grades', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->seed(SchoolGradesSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $enrollment = Enrollment::query()->findOrFail('en-9');
    $studentId = $enrollment->student_id;

    $this->getJson("/api/v1/students/{$studentId}/bulletin?termId=term-2026-1")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['termId']);

    $devoir = $this->postJson('/api/v1/marking-windows', [
        'termId' => 'term-2026-1',
        'type' => 'devoir',
        'opensOn' => '2026-10-01',
        'closesOn' => '2026-11-20',
    ])->assertCreated()->json('data');

    $composition = $this->postJson('/api/v1/marking-windows', [
        'termId' => 'term-2026-1',
        'type' => 'composition',
        'opensOn' => '2026-10-01',
        'closesOn' => '2026-11-20',
    ])->assertCreated()->json('data');

    $this->getJson("/api/v1/students/{$studentId}/bulletin?termId=term-2026-1")
        ->assertUnprocessable();

    $this->postJson("/api/v1/marking-windows/{$devoir['id']}/close")->assertOk()
        ->assertJsonPath('data.closedAt', fn ($v) => $v !== null);

    $this->postJson("/api/v1/marking-windows/{$composition['id']}/close")->assertOk();

    $this->getJson("/api/v1/students/{$studentId}/bulletin?termId=term-2026-1")
        ->assertOk()
        ->assertJsonPath('data.average', fn ($v) => $v !== null);
});

test('notify endpoint sends marking window mail', function () {
    Notification::fake();

    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]);

    $window = $this->postJson('/api/v1/marking-windows', [
        'termId' => 'term-2026-1',
        'type' => 'examen',
        'opensOn' => '2026-12-01',
        'closesOn' => '2026-12-20',
    ])->assertCreated()->json('data');

    $this->postJson("/api/v1/marking-windows/{$window['id']}/notify")
        ->assertOk()
        ->assertJsonPath('sent', fn ($v) => $v >= 1);

    Notification::assertSentTo(
        User::query()->where('email', 's.bakayoko@palmiers.cg')->firstOrFail(),
        MarkingWindowNotification::class,
    );
});

test('admin can enter composition grades anytime without window', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $assessment = Assessment::query()->create([
        'id' => ResourceId::make('as'),
        'type' => 'composition',
        'name' => 'Comp admin',
        'classroom_id' => 'cr-6eme',
        'subject_id' => 'su-math-6eme',
        'term_id' => 'term-2026-1',
        'held_on' => '2026-11-10',
        'held_at' => '08:00',
        'held_until' => '10:00',
    ]);

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-6eme')->firstOrFail();

    $this->putJson('/api/v1/grades', [
        'assessmentId' => $assessment->id,
        'grades' => [
            ['enrollmentId' => $enrollment->id, 'score' => 11],
        ],
    ])->assertOk();

    expect(Grade::query()->where('assessment_id', $assessment->id)->count())->toBe(1);
});
