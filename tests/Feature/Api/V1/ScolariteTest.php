<?php

use App\Models\Admission;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('staff can create a student with enrollment guardian and photo', function () {
    Storage::fake('public');
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->secretaire()->create());

    $payload = $this->post('/api/v1/students', [
        'firstName' => 'Awa',
        'lastName' => 'Kouassi',
        'gender' => 'femme',
        'bornOn' => '2015-03-12',
        'city' => 'Brazzaville',
        'neighborhood' => 'Poto-Poto',
        'classroomId' => 'cr-ce1',
        'academicYearId' => 'year-2026',
        'guardianFirstName' => 'Marie',
        'guardianLastName' => 'Kouassi',
        'guardianPhone' => '0652000001',
        'guardianRelation' => 'mere',
        'photo' => UploadedFile::fake()->image('awa.jpg'),
        'files' => [UploadedFile::fake()->create('extrait.pdf', 100, 'application/pdf')],
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->json('data');

    expect($payload['gender'])->toBe('femme')
        ->and($payload['photoUrl'])->not->toBeNull()
        ->and($payload['files'])->toHaveCount(1)
        ->and($payload['enrollments'])->toHaveCount(1)
        ->and($payload['guardians'])->toHaveCount(1)
        ->and($payload['matricule'])->toStartWith('MAT-');
});

test('enseignant cannot manage guardians', function () {
    $this->actingAs(User::factory()->enseignant()->create());

    $this->getJson('/api/v1/guardians')->assertForbidden();
});

test('guardian attach enforces a single tuteur per student', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $student = Student::query()->firstOrFail();
    $first = Guardian::factory()->create();
    $second = Guardian::factory()->create();

    $this->postJson("/api/v1/guardians/{$first->id}/students", [
        'studentId' => $student->id,
        'relation' => 'tuteur',
    ])->assertOk();

    $this->postJson("/api/v1/guardians/{$second->id}/students", [
        'studentId' => $student->id,
        'relation' => 'tuteur',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['relation']);
});

test('accepting an admission creates student enrollment and guardian', function () {
    Storage::fake('public');
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $admission = $this->postJson('/api/v1/admissions', [
        'academicYearId' => 'year-2026',
        'cycle' => 'primaire',
        'classroomId' => 'cr-ce1',
        'firstName' => 'Chantal',
        'lastName' => 'Ngouabi',
        'gender' => 'femme',
        'bornOn' => '2018-05-14',
        'city' => 'Brazzaville',
        'neighborhood' => 'Poto-Poto',
        'guardianLastName' => 'Ngouabi',
        'guardianFirstName' => 'Sylvie',
        'guardianPhone' => '0652210111',
        'guardianRelation' => 'mere',
    ])->assertCreated()
        ->json('data');

    $this->patchJson('/api/v1/admissions/'.$admission['id'].'/status', [
        'status' => 'en_etude',
    ])->assertOk();

    $this->patchJson('/api/v1/admissions/'.$admission['id'].'/status', [
        'status' => 'acceptee',
    ])->assertOk();

    $inscrit = $this->patchJson('/api/v1/admissions/'.$admission['id'].'/status', [
        'status' => 'inscrit',
    ])->assertOk()
        ->json('data');

    expect($inscrit['status'])->toBe('inscrit')
        ->and($inscrit['studentId'])->not->toBeNull()
        ->and(Student::query()->find($inscrit['studentId']))->not->toBeNull()
        ->and(Enrollment::query()->where('student_id', $inscrit['studentId'])->exists())->toBeTrue()
        ->and(Admission::query()->find($admission['id'])?->student_id)->toBe($inscrit['studentId']);
});

test('validating a reenrollment upserts the year enrollment', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $student = Student::factory()->create();

    $reenrollment = $this->postJson('/api/v1/reenrollments', [
        'academicYearId' => 'year-2026',
        'studentId' => $student->id,
        'previousClass' => 'CM1 A (2025–2026)',
        'classroomId' => 'cr-cm2',
    ])->assertCreated()
        ->json('data');

    $this->patchJson('/api/v1/reenrollments/'.$reenrollment['id'].'/status', [
        'status' => 'validee',
    ])->assertOk()
        ->assertJsonPath('data.status', 'validee');

    expect(
        Enrollment::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', 'year-2026')
            ->where('classroom_id', 'cr-cm2')
            ->exists()
    )->toBeTrue();
});
