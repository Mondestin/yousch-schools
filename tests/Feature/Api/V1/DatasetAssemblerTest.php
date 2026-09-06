<?php

use App\Models\AcademicYear;
use App\Models\User;
use App\Support\Api\ApiContract;
use App\Support\School\SchoolDatasetAssembler;
use App\Support\SchoolCatalog;
use App\Support\Tenancy\CurrentSchool;
use Database\Seeders\SchoolOfficeSeeder;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

test('api contract lists resources for mobile clients', function () {
    $this->getJson('/api/v1/meta/contract')
        ->assertOk()
        ->assertJsonPath('version', 'v1')
        ->assertJsonStructure(['resources', 'datasetKeys', 'auth'])
        ->assertJsonFragment(['path' => '/catalog'])
        ->assertJsonFragment(['path' => '/announcements']);

    expect(ApiContract::resources())->not->toBeEmpty()
        ->and(collect(ApiContract::resources())->pluck('name'))
        ->toContain('catalog', 'inventory', 'students.documents');
});

test('assembler bootstraps french academic year when tenant has none', function () {
    expect(AcademicYear::query()->exists())->toBeFalse();

    $dataset = app(SchoolDatasetAssembler::class)->assemble();

    expect($dataset['students'])->toBeEmpty()
        ->and($dataset['teachers'])->toBeEmpty()
        ->and($dataset['announcements'])->toBeEmpty()
        ->and($dataset['academicYears'])->toHaveCount(1)
        ->and($dataset['academicYears'][0]['label'])->toBe('2026-2027')
        ->and($dataset['academicYears'][0]['isCurrent'])->toBeTrue()
        ->and($dataset['terms'])->toHaveCount(3)
        ->and($dataset['profile']['name'])->not->toBe(SchoolCatalog::fixture()['profile']['name'])
        ->and(array_keys($dataset))->toEqualCanonicalizing(ApiContract::datasetKeys());
});

test('assembler uses demo fixture when no school is bound', function () {
    CurrentSchool::clear();

    $dataset = app(SchoolDatasetAssembler::class)->assemble();

    expect($dataset['profile']['name'])->toBe(SchoolCatalog::fixture()['profile']['name'])
        ->and($dataset['students'])->not->toBeEmpty();
});

test('assembler prefers eloquent after taxonomy seed and inertia catalog matches', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->seed(SchoolOfficeSeeder::class);

    $dataset = app(SchoolDatasetAssembler::class)->assemble();

    expect($dataset['academicYears'])->not->toBeEmpty()
        ->and($dataset['students'])->not->toBeEmpty()
        ->and($dataset['announcements'])->not->toBeEmpty()
        ->and($dataset['inventory'])->not->toBeEmpty()
        ->and(SchoolCatalog::dataset()['students'])->toHaveCount(count($dataset['students']));

    $this->actingAs(User::factory()->directeur()->create());

    $this->getJson('/api/v1/catalog')
        ->assertOk()
        ->assertJsonPath('academicYears.0.id', $dataset['academicYears'][0]['id'])
        ->assertJsonCount(count($dataset['announcements']), 'announcements');
});
