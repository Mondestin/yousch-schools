<?php

use App\Enums\StaffRole;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\Notifications\StaffAccountCreated;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Facades\Notification;

test('college student create provisions pupil and parent portal accounts', function () {
    Notification::fake();
    $this->seed(SchoolTaxonomySeeder::class);

    $admin = User::factory()->admin()->create();
    $classroom = Classroom::query()->where('cycle', 'college')->firstOrFail();

    $response = $this->actingAs($admin)
        ->postJson('/api/v1/students', [
            'firstName' => 'Rokia',
            'lastName' => 'Cissé',
            'gender' => 'femme',
            'bornOn' => '2012-03-12',
            'city' => 'Brazzaville',
            'neighborhood' => 'Moungali',
            'email' => 'rokia.eleve@example.test',
            'classroomId' => $classroom->id,
            'academicYearId' => $classroom->academic_year_id,
            'guardianFirstName' => 'Aminata',
            'guardianLastName' => 'Cissé',
            'guardianPhone' => '06 111 22 33',
            'guardianProfession' => 'Commerçante',
            'guardianEmail' => 'aminata.parent@example.test',
            'guardianRelation' => 'mere',
        ])
        ->assertCreated()
        ->assertJsonPath('meta.studentAccountCreated', true)
        ->assertJsonPath('meta.parentAccountCreated', true);

    $student = Student::query()->findOrFail($response->json('data.id'));
    $guardian = Guardian::query()->where('email', 'aminata.parent@example.test')->firstOrFail();

    expect($student->user_id)->not->toBeNull()
        ->and($guardian->user_id)->not->toBeNull();

    $pupil = User::query()->findOrFail($student->user_id);
    $parent = User::query()->findOrFail($guardian->user_id);

    expect($pupil->role)->toBe(StaffRole::Eleve)
        ->and($parent->role)->toBe(StaffRole::Parent);

    Notification::assertSentTo($pupil, StaffAccountCreated::class);
    Notification::assertSentTo($parent, StaffAccountCreated::class);
});

test('college student create requires pupil email', function () {
    $this->seed(SchoolTaxonomySeeder::class);

    $admin = User::factory()->admin()->create();
    $classroom = Classroom::query()->where('cycle', 'college')->firstOrFail();

    $this->actingAs($admin)
        ->postJson('/api/v1/students', [
            'firstName' => 'Rokia',
            'lastName' => 'Cissé',
            'gender' => 'femme',
            'bornOn' => '2012-03-12',
            'city' => 'Brazzaville',
            'neighborhood' => 'Moungali',
            'classroomId' => $classroom->id,
            'academicYearId' => $classroom->academic_year_id,
            'guardianFirstName' => 'Aminata',
            'guardianLastName' => 'Cissé',
            'guardianPhone' => '06 111 22 33',
            'guardianProfession' => 'Commerçante',
            'guardianRelation' => 'mere',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('primaire student create provisions parent account only when email given', function () {
    Notification::fake();
    $this->seed(SchoolTaxonomySeeder::class);

    $admin = User::factory()->admin()->create();
    $classroom = Classroom::query()->where('cycle', 'primaire')->firstOrFail();

    $this->actingAs($admin)
        ->postJson('/api/v1/students', [
            'firstName' => 'Awa',
            'lastName' => 'Mbemba',
            'gender' => 'femme',
            'bornOn' => '2016-05-01',
            'city' => 'Brazzaville',
            'neighborhood' => 'Bacongo',
            'classroomId' => $classroom->id,
            'academicYearId' => $classroom->academic_year_id,
            'guardianFirstName' => 'Jean',
            'guardianLastName' => 'Mbemba',
            'guardianPhone' => '06 222 33 44',
            'guardianProfession' => 'Chauffeur',
            'guardianEmail' => 'jean.parent@example.test',
            'guardianRelation' => 'pere',
        ])
        ->assertCreated()
        ->assertJsonPath('meta.studentAccountCreated', false)
        ->assertJsonPath('meta.parentAccountCreated', true);

    $studentId = Student::query()->where('last_name', 'Mbemba')->value('id');
    $student = Student::query()->findOrFail($studentId);

    expect($student->user_id)->toBeNull()
        ->and(User::query()->where('email', 'jean.parent@example.test')->value('role'))
        ->toBe(StaffRole::Parent);
});
