<?php

use App\Enums\Cycle;
use App\Enums\Gender;
use App\Models\Track;
use App\Models\User;
use Database\Seeders\SchoolTaxonomySeeder;

test('api contract meta is public', function () {
    $this->getJson('/api/v1/meta/contract')
        ->assertOk()
        ->assertJsonPath('version', 'v1')
        ->assertJsonPath('prefix', '/api/v1')
        ->assertJsonFragment(['keys' => 'camelCase']);
});

test('api enums meta lists african cycles and gender storage values', function () {
    $this->getJson('/api/v1/meta/enums')
        ->assertOk()
        ->assertJsonPath('cycle', [
            'prescolaire',
            'primaire',
            'college',
            'lycee_general',
            'lycee_technique',
        ])
        ->assertJsonPath('gender', ['femme', 'homme']);
});

test('guests cannot fetch the api catalog', function () {
    $this->getJson('/api/v1/catalog')->assertUnauthorized();
});

test('authenticated staff can fetch the api catalog', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson('/api/v1/catalog')
        ->assertOk()
        ->assertJsonStructure([
            'profile' => ['name', 'city'],
            'academicYears',
            'tracks',
            'gradeLevels',
        ]);
});

test('gender enum labels are féminin and masculin', function () {
    expect(Gender::Femme->label())->toBe('Féminin')
        ->and(Gender::Homme->label())->toBe('Masculin');
});

test('taxonomy seeder creates lycée technique série F2', function () {
    $this->seed(SchoolTaxonomySeeder::class);

    $track = Track::query()->find('tr-f2');

    expect($track)->not->toBeNull()
        ->and($track->cycle)->toBe(Cycle::LyceeTechnique)
        ->and($track->code)->toBe('F2')
        ->and($track->name)->toBe('F2');
});
