<?php

use App\Enums\StaffRole;
use App\Models\PersonalAccessToken;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\Auth\StaffAccess;
use Database\Seeders\SchoolStaffSeeder;

test('api login returns bearer token and staff payload', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $response = $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => 'admin@example.test',
        'password' => 'password',
        'deviceName' => 'iphone-test',
    ])->assertOk()
        ->assertJsonPath('tokenType', 'Bearer')
        ->assertJsonPath('user.email', 'admin@example.test')
        ->assertJsonPath('user.role', 'admin')
        ->assertJsonPath('school.domain', $school->domain);

    $token = $response->json('token');

    expect($token)->toBeString()->not->toBeEmpty()
        ->and(PersonalAccessToken::query()->count())->toBe(1);

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('data.role', 'admin');
});

test('api login rejects bad credentials', function () {
    $school = defaultSchool();
    User::factory()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => 'admin@example.test',
        'password' => 'wrong',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('api logout deletes the current access token', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $token = $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => $user->email,
        'password' => 'password',
    ])->json('token');

    $this->withToken($token)
        ->postJson('/api/v1/logout')
        ->assertOk();

    expect(PersonalAccessToken::query()->count())->toBe(0);

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertUnauthorized();
});

test('directeur can read subscription but secretaire cannot', function () {
    $this->seed(SchoolStaffSeeder::class);

    $directeur = User::factory()->directeur()->create();
    $secretaire = User::factory()->secretaire()->create();

    $this->actingAs($directeur)
        ->getJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.plan', 'platinium')
        ->assertJsonStructure([
            'data' => [
                'plan',
                'status',
                'seats',
                'usedSeats',
                'renewsOn',
                'monthlyAmount',
                'receipts',
            ],
        ]);

    $this->actingAs($secretaire)
        ->getJson('/api/v1/subscription')
        ->assertForbidden();
});

test('staff access mirrors frontend role nav for subscription and staff', function () {
    expect(StaffAccess::can(StaffRole::Admin, 'subscription'))->toBeTrue()
        ->and(StaffAccess::can(StaffRole::Directeur, 'subscription'))->toBeTrue()
        ->and(StaffAccess::can(StaffRole::Secretaire, 'subscription'))->toBeFalse()
        ->and(StaffAccess::can(StaffRole::Enseignant, 'subscription'))->toBeFalse()
        ->and(StaffAccess::can(StaffRole::Directeur, 'staff'))->toBeFalse()
        ->and(StaffAccess::can(StaffRole::Admin, 'staff'))->toBeTrue();
});

test('staff seeder creates subscription and fixture staff seats', function () {
    $this->seed(SchoolStaffSeeder::class);

    expect(SchoolSubscription::query()->count())->toBe(1)
        ->and(User::query()->where('email', 'admin@palmiers.cg')->exists())->toBeTrue()
        ->and(User::query()->where('email', 'direction@palmiers.cg')->value('role')->value)->toBe('directeur');
});
