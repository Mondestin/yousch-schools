<?php

use App\Enums\StaffRole;
use App\Models\IdentityCard;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

beforeEach(function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
});

test('admin can update identity card theme color', function () {
    $admin = User::factory()->create(['role' => StaffRole::Admin]);

    $this->actingAs($admin)
        ->putJson('/api/v1/identity-cards/theme', [
            'idCardAccent' => '#fd7302',
            'idCardBody' => '#fff4eb',
        ])
        ->assertOk()
        ->assertJsonPath('data.idCardAccent', '#fd7302')
        ->assertJsonPath('data.idCardBody', '#fff4eb');

    expect(SchoolProfile::query()->value('id_card_accent'))->toBe('#fd7302')
        ->and(SchoolProfile::query()->value('id_card_body'))->toBe('#fff4eb');
});

test('directeur cannot update identity card theme color', function () {
    $directeur = User::factory()->create(['role' => StaffRole::Directeur]);

    $this->actingAs($directeur)
        ->putJson('/api/v1/identity-cards/theme', [
            'idCardAccent' => '#fd7302',
        ])
        ->assertForbidden();
});

test('admin can print block unblock and revoke an identity card with password', function () {
    $admin = User::factory()->create([
        'role' => StaffRole::Admin,
        'password' => 'password',
    ]);
    $studentId = Student::query()->value('id');

    expect($studentId)->not->toBeNull();

    $this->actingAs($admin)
        ->postJson('/api/v1/identity-cards/print', [
            'subjectType' => 'student',
            'subjectId' => $studentId,
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.printedAt', fn ($value) => is_string($value) && $value !== '');

    $this->actingAs($admin)
        ->postJson('/api/v1/identity-cards/block', [
            'subjectType' => 'student',
            'subjectId' => $studentId,
            'password' => 'password',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'blocked');

    $this->actingAs($admin)
        ->postJson('/api/v1/identity-cards/unblock', [
            'subjectType' => 'student',
            'subjectId' => $studentId,
            'password' => 'password',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->actingAs($admin)
        ->postJson('/api/v1/identity-cards/revoke', [
            'subjectType' => 'student',
            'subjectId' => $studentId,
            'password' => 'password',
            'reason' => 'Perdue',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'revoked')
        ->assertJsonPath('data.revokeReason', 'Perdue');

    expect(IdentityCard::query()->where('subject_id', $studentId)->value('status'))
        ->toBe('revoked');
});

test('block requires a valid password', function () {
    $admin = User::factory()->create([
        'role' => StaffRole::Admin,
        'password' => 'password',
    ]);
    $studentId = Student::query()->value('id');

    $this->actingAs($admin)
        ->postJson('/api/v1/identity-cards/block', [
            'subjectType' => 'student',
            'subjectId' => $studentId,
            'password' => 'wrong-password',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});
