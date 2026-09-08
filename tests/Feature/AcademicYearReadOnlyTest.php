<?php

use App\Models\AcademicYear;
use App\Models\User;
use App\Support\SchoolCatalog;
use App\Support\Tenancy\CurrentSchool;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Http\Request;

test('school context marks past years as read only', function () {
    CurrentSchool::clear();

    $past = Request::create('/eleves', 'GET', ['annee' => '2025-2026']);
    $current = Request::create('/eleves', 'GET', ['annee' => '2026-2027']);

    expect(SchoolCatalog::context($past))->toMatchArray([
        'academicYearId' => 'year-2025',
        'isCurrentYear' => false,
        'readOnly' => true,
    ])->and(SchoolCatalog::context($current))->toMatchArray([
        'academicYearId' => 'year-2026',
        'isCurrentYear' => true,
        'readOnly' => false,
    ]);
});

test('api rejects writes when browsing a past academic year', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $past = AcademicYear::query()->where('is_current', false)->first();
    expect($past)->not->toBeNull();

    $annee = SchoolCatalog::yearQuery($past->label);

    $this->withHeader('X-School-Annee', $annee)
        ->postJson('/api/v1/school/venues', [
            'name' => 'Salle test',
            'kind' => 'laboratoire',
            'capacity' => 30,
            'available' => true,
        ])
        ->assertStatus(423)
        ->assertJsonFragment([
            'message' => 'Cette année scolaire n’est plus modifiable. Passez à l’année en cours.',
        ]);
});

test('api allows writes when browsing the current academic year', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $current = AcademicYear::query()->where('is_current', true)->first();
    expect($current)->not->toBeNull();

    $annee = SchoolCatalog::yearQuery($current->label);

    $this->withHeader('X-School-Annee', $annee)
        ->postJson('/api/v1/school/venues', [
            'name' => 'Salle ouverte',
            'kind' => 'laboratoire',
            'capacity' => 28,
            'available' => true,
        ])
        ->assertSuccessful();
});

test('academic year management stays writable on past years', function () {
    $this->seed(SchoolTaxonomySeeder::class);

    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $past = AcademicYear::query()->where('is_current', false)->first();
    expect($past)->not->toBeNull();

    $annee = SchoolCatalog::yearQuery($past->label);

    $this->withHeader('X-School-Annee', $annee)
        ->postJson('/api/v1/academic-years', [
            'startYear' => 2027,
            'isCurrent' => false,
        ])
        ->assertSuccessful();
});
