<?php

use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('secretaire cannot manage teachers or subjects', function () {
    $this->actingAs(User::factory()->secretaire()->create());

    $this->getJson('/api/v1/teachers')->assertForbidden();
    $this->getJson('/api/v1/subjects')->assertForbidden();
});

test('staff can create a teacher with photo and cv file', function () {
    Storage::fake('public');
    $this->actingAs(User::factory()->directeur()->create());

    $payload = $this->post('/api/v1/teachers', [
        'firstName' => 'Binta',
        'lastName' => 'Koné',
        'phone' => '0652000099',
        'gender' => 'femme',
        'qualification' => 'Licence de lettres',
        'hiredOn' => '2020-09-01',
        'city' => 'Brazzaville',
        'neighborhood' => 'Poto-Poto',
        'maritalStatus' => 'célibataire',
        'status' => 'actif',
        'photo' => UploadedFile::fake()->image('binta.jpg'),
        'files' => [UploadedFile::fake()->create('cv.pdf', 120, 'application/pdf')],
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->json('data');

    expect($payload['code'])->toStartWith('ENS-')
        ->and($payload['gender'])->toBe('femme')
        ->and($payload['status'])->toBe('actif')
        ->and($payload['photoUrl'])->not->toBeNull()
        ->and($payload['files'])->toHaveCount(1);
});

test('college subject requires coefficient and primaire does not', function () {
    Storage::fake('public');
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $this->postJson('/api/v1/subjects', [
        'code' => 'HIST',
        'name' => 'Histoire',
        'cycle' => 'college',
        'gradeLevelId' => 'gl-6eme',
        'coefficient' => null,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['coefficient']);

    $college = $this->post('/api/v1/subjects', [
        'code' => 'HIST',
        'name' => 'Histoire',
        'cycle' => 'college',
        'gradeLevelId' => 'gl-6eme',
        'coefficient' => 2,
        'files' => [UploadedFile::fake()->create('programme.pdf', 80, 'application/pdf')],
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->json('data');

    expect($college['coefficient'])->toEqual(2)
        ->and($college['files'])->toHaveCount(1);

    $primaire = $this->postJson('/api/v1/subjects', [
        'code' => 'EVEIL',
        'name' => 'Éveil',
        'cycle' => 'primaire',
        'gradeLevelId' => 'gl-ce1',
    ])->assertCreated()
        ->json('data');

    expect($primaire['coefficient'])->toBeNull();
});

test('teacher assignment links teacher classroom and subject in the same cycle', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->enseignant()->create());

    $teacher = Teacher::factory()->create();
    $subject = Subject::factory()->create([
        'cycle' => 'primaire',
        'grade_level_id' => 'gl-ce1',
        'track_id' => null,
        'coefficient' => null,
        'code' => 'LECT',
    ]);

    $created = $this->postJson('/api/v1/teacher-assignments', [
        'teacherId' => $teacher->id,
        'academicYearId' => 'year-2026',
        'classroomId' => 'cr-ce1',
        'subjectId' => $subject->id,
    ])->assertCreated()
        ->json('data');

    expect($created['id'])->toStartWith('ta-')
        ->and(TeacherAssignment::query()->find($created['id']))->not->toBeNull();

    $this->postJson('/api/v1/teacher-assignments', [
        'teacherId' => $teacher->id,
        'academicYearId' => 'year-2026',
        'classroomId' => 'cr-ce1',
        'subjectId' => $subject->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['subjectId']);
});
