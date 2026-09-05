<?php

use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

test('guests cannot list students or teachers', function () {
    $this->getJson('/api/v1/students')->assertUnauthorized();
    $this->getJson('/api/v1/teachers')->assertUnauthorized();
});

test('factories can enroll students in 2nde C and Terminale F2', function () {
    $this->seed(SchoolTaxonomySeeder::class);

    $seconde = Enrollment::factory()->secondeC()->create([
        'academic_year_id' => 'year-2026',
    ]);
    $terminale = Enrollment::factory()->terminaleF2()->create([
        'academic_year_id' => 'year-2026',
    ]);

    expect($seconde->classroom_id)->toBe('cr-2nde-c')
        ->and($seconde->track_id)->toBe('tr-c')
        ->and($terminale->classroom_id)->toBe('cr-tle-f2')
        ->and($terminale->track_id)->toBe('tr-f2')
        ->and(Student::query()->find($seconde->student_id))->not->toBeNull();
});

test('people seeder loads students teachers and key lycée enrollments', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    expect(Student::query()->count())->toBe(146)
        ->and(Teacher::query()->count())->toBe(4);

    $secondeC = Enrollment::query()
        ->where('classroom_id', 'cr-2nde-c')
        ->where('track_id', 'tr-c')
        ->get();

    $terminaleF2 = Enrollment::query()
        ->where('classroom_id', 'cr-tle-f2')
        ->where('track_id', 'tr-f2')
        ->get();

    expect($secondeC)->not->toBeEmpty()
        ->and($terminaleF2)->not->toBeEmpty();
});

test('authenticated staff can list students and fetch one with enrollments', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->create());

    $list = $this->getJson('/api/v1/students')
        ->assertOk()
        ->json('data');

    expect($list)->toBeArray()->not->toBeEmpty()
        ->and($list[0])->toHaveKeys(['id', 'matricule', 'firstName', 'lastName', 'gender']);

    $studentId = $list[0]['id'];

    $this->getJson("/api/v1/students/{$studentId}")
        ->assertOk()
        ->assertJsonPath('data.id', $studentId)
        ->assertJsonStructure([
            'data' => [
                'id',
                'matricule',
                'enrollments',
                'guardians',
            ],
        ]);
});

test('authenticated staff can list teachers', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->create());

    $this->getJson('/api/v1/teachers')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'code', 'firstName', 'lastName', 'status'],
            ],
        ]);
});

test('catalog returns database people after people seeder', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->create());

    $catalog = $this->getJson('/api/v1/catalog')
        ->assertOk()
        ->json();

    expect($catalog['students'])->toHaveCount(Student::query()->count())
        ->and($catalog['teachers'])->toHaveCount(Teacher::query()->count())
        ->and($catalog['enrollments'])->toHaveCount(Enrollment::query()->count());

    $classroomIds = collect($catalog['enrollments'])->pluck('classroomId');

    expect($classroomIds)->toContain('cr-2nde-c')
        ->and($classroomIds)->toContain('cr-tle-f2');
});
