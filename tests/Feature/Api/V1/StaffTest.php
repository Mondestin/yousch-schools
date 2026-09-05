<?php

use App\Models\User;

test('admin can list create update and delete staff', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->getJson('/api/v1/staff')
        ->assertOk()
        ->assertJsonStructure(['data']);

    $created = $this->actingAs($admin)
        ->postJson('/api/v1/staff', [
            'name' => 'Amina Nkouka',
            'email' => 'amina.staff@example.test',
            'phone' => '06 500 00 01',
            'role' => 'secretaire',
            'cycles' => ['primaire', 'college'],
        ])
        ->assertCreated()
        ->assertJsonPath('data.email', 'amina.staff@example.test')
        ->assertJsonPath('data.role', 'secretaire')
        ->json('data');

    $this->actingAs($admin)
        ->putJson('/api/v1/staff/'.$created['id'], [
            'name' => 'Amina Nkouka',
            'email' => 'amina.staff@example.test',
            'phone' => '06 500 00 02',
            'role' => 'directeur',
            'cycles' => ['college'],
        ])
        ->assertOk()
        ->assertJsonPath('data.role', 'directeur')
        ->assertJsonPath('data.phone', '06 500 00 02');

    $this->actingAs($admin)
        ->deleteJson('/api/v1/staff/'.$created['id'])
        ->assertOk();

    expect(User::query()->whereKey($created['id'])->exists())->toBeFalse();
});

test('admin cannot delete own staff account', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->deleteJson('/api/v1/staff/'.$admin->id)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['id']);
});

test('directeur cannot manage staff', function () {
    $directeur = User::factory()->directeur()->create();

    $this->actingAs($directeur)
        ->getJson('/api/v1/staff')
        ->assertForbidden();
});
