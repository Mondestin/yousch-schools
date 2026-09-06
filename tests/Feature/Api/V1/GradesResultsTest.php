<?php

use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\User;
use Database\Seeders\SchoolGradesSeeder;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

test('secretaire cannot manage assessments grades or results', function () {
    $this->actingAs(User::factory()->secretaire()->create());

    $this->getJson('/api/v1/assessments')->assertForbidden();
    $this->putJson('/api/v1/grades', [
        'assessmentId' => 'as-1',
        'grades' => [['enrollmentId' => 'en-1', 'score' => 12]],
    ])->assertForbidden();
    $this->getJson('/api/v1/classrooms/cr-ce1/results?termId=term-2026-1')->assertForbidden();
});

test('grades bulk upsert validates 0 to 20 and unique enrollment assessment subject', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $assessment = $this->postJson('/api/v1/assessments', [
        'type' => 'devoir',
        'name' => 'Devoir 2 - Mathématiques',
        'classroomId' => 'cr-6eme',
        'subjectId' => 'su-math-6eme',
        'termId' => 'term-2026-1',
        'heldOn' => '2026-11-05',
        'heldAt' => '08:25',
        'heldUntil' => '09:20',
    ])->assertCreated()
        ->json('data');

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-6eme')->firstOrFail();

    $this->putJson('/api/v1/grades', [
        'assessmentId' => $assessment['id'],
        'grades' => [
            ['enrollmentId' => $enrollment->id, 'score' => 21],
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['grades.0.score']);

    $saved = $this->putJson('/api/v1/grades', [
        'assessmentId' => $assessment['id'],
        'grades' => [
            ['enrollmentId' => $enrollment->id, 'score' => 14.5],
        ],
    ])->assertOk()
        ->json('data');

    expect($saved)->toHaveCount(1)
        ->and($saved[0]['score'])->toEqual(14.5)
        ->and(Grade::query()->where('assessment_id', $assessment['id'])->count())->toBe(1);

    $this->putJson('/api/v1/grades', [
        'assessmentId' => $assessment['id'],
        'grades' => [
            ['enrollmentId' => $enrollment->id, 'score' => 16],
        ],
    ])->assertOk();

    expect(Grade::query()->where('assessment_id', $assessment['id'])->count())->toBe(1)
        ->and(Grade::query()->where('assessment_id', $assessment['id'])->value('score'))->toEqual(16);
});

test('enseignant cannot grade outside their assignments', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 's.bakayoko@palmiers.cg',
    ]));

    $this->postJson('/api/v1/assessments', [
        'type' => 'devoir',
        'name' => 'Devoir hors affectation',
        'classroomId' => 'cr-ce1',
        'subjectId' => 'su-fra-ce1',
        'termId' => 'term-2026-1',
        'heldOn' => '2026-11-05',
        'heldAt' => '08:25',
        'heldUntil' => '09:20',
    ])->assertForbidden()
        ->assertJsonPath('message', 'Vous n’êtes pas affecté à cette classe ou matière.');
});

test('bulletin returns moyenne mention and rank', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->seed(SchoolGradesSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $enrollment = Enrollment::query()->findOrFail('en-9');
    $studentId = $enrollment->student_id;

    $bulletin = $this->getJson("/api/v1/students/{$studentId}/bulletin?termId=term-2026-1")
        ->assertOk()
        ->json('data');

    expect($bulletin['average'])->not->toBeNull()
        ->and($bulletin['mention'])->not->toBeNull()
        ->and($bulletin['result'])->toBeIn(['Admis', 'Échoué'])
        ->and($bulletin['lines'])->not->toBeEmpty()
        ->and($bulletin)->toHaveKeys(['rank', 'classSize', 'appreciation', 'profile']);

    $results = $this->getJson('/api/v1/classrooms/'.$enrollment->classroom_id.'/results?termId=term-2026-1')
        ->assertOk()
        ->json('data');

    expect($results['rows'])->not->toBeEmpty()
        ->and($results)->toHaveKeys(['admitted', 'failed', 'classAverage']);
});
