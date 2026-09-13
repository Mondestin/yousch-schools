<?php

use App\Models\User;
use App\Support\Billing\SubscriptionCatalog;
use Database\Seeders\SchoolTaxonomySeeder;

test('gold plan covers only préscolaire and primaire', function () {
    expect(SubscriptionCatalog::cyclesFor('gold'))->toBe([
        'prescolaire',
        'primaire',
    ])
        ->and(SubscriptionCatalog::cyclesFor('platinium'))->toBe([
            'prescolaire',
            'primaire',
            'college',
        ])
        ->and(SubscriptionCatalog::cyclesFor('titanium'))->toBe([
            'prescolaire',
            'primaire',
            'college',
            'lycee_general',
            'lycee_technique',
        ]);
});

test('gold subscription rejects college classroom and staff cycles', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    setSubscriptionPlan('gold');
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->postJson('/api/v1/classrooms', [
            'academicYearId' => 'year-2026',
            'cycle' => 'college',
            'gradeLevelId' => 'gl-6eme',
            'code' => '6A',
            'name' => '6ème A',
            'capacity' => 40,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['cycle']);

    $this->actingAs($admin)
        ->postJson('/api/v1/staff', [
            'name' => 'Prof Collège',
            'email' => 'college.staff@example.test',
            'phone' => '06 500 00 77',
            'role' => 'enseignant',
            'cycles' => ['college'],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['cycles']);
});

test('catalog cycles follow the school subscription plan', function () {
    setSubscriptionPlan('gold');
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->getJson('/api/v1/catalog')
        ->assertOk()
        ->assertJsonPath('cycles.0.value', 'prescolaire')
        ->assertJsonPath('cycles.1.value', 'primaire')
        ->assertJsonCount(2, 'cycles');

    setSubscriptionPlan('platinium');

    $this->actingAs($admin)
        ->getJson('/api/v1/catalog')
        ->assertOk()
        ->assertJsonCount(3, 'cycles')
        ->assertJsonFragment(['value' => 'college']);
});
