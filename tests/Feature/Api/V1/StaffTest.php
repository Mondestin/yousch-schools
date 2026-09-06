<?php

use App\Models\School;
use App\Models\User;
use App\Notifications\StaffAccountCreated;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

test('admin can list create update and delete staff', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $school = School::query()->findOrFail($admin->school_id);

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
        ->assertJsonPath('data.blocked', false)
        ->assertJsonPath('meta.credentialsEmailed', true)
        ->json('data');

    $staff = User::query()->findOrFail($created['id']);

    Notification::assertSentTo(
        $staff,
        StaffAccountCreated::class,
        function (StaffAccountCreated $notification) use ($school, $staff): bool {
            expect($notification->domain)->toBe($school->domain)
                ->and($notification->loginUrl)->toContain('/login/domain/'.$school->domain)
                ->and($notification->loginUrl)->toContain('email='.urlencode($staff->email))
                ->and($notification->plainPassword)->not->toBe('')
                ->and($notification->isResend)->toBeFalse()
                ->and(Hash::check($notification->plainPassword, $staff->password))->toBeTrue();

            return true;
        },
    );

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

test('admin can resend credentials with password rotation', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $staff = User::factory()->secretaire()->create([
        'school_id' => $admin->school_id,
        'password' => 'old-password-123',
    ]);
    $oldHash = $staff->password;

    $this->actingAs($admin)
        ->postJson(route('api.v1.staff.resend-credentials', $staff->id))
        ->assertOk()
        ->assertJsonPath('meta.passwordRotated', true);

    $staff->refresh();

    expect($staff->password)->not->toBe($oldHash);

    Notification::assertSentTo(
        $staff,
        StaffAccountCreated::class,
        function (StaffAccountCreated $notification) use ($staff): bool {
            expect($notification->isResend)->toBeTrue()
                ->and(Hash::check($notification->plainPassword, $staff->password))->toBeTrue();

            return true;
        },
    );
});

test('admin can block and unblock staff', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $staff = User::factory()->enseignant()->create([
        'school_id' => $admin->school_id,
    ]);

    $this->actingAs($admin)
        ->postJson(route('api.v1.staff.block', $staff->id))
        ->assertOk()
        ->assertJsonPath('data.blocked', true);

    expect($staff->fresh()->isBlocked())->toBeTrue();

    $this->actingAs($admin)
        ->postJson(route('api.v1.staff.resend-credentials', $staff->id))
        ->assertUnprocessable();

    $this->actingAs($admin)
        ->postJson(route('api.v1.staff.unblock', $staff->id))
        ->assertOk()
        ->assertJsonPath('data.blocked', false);

    expect($staff->fresh()->isBlocked())->toBeFalse();
});

test('admin cannot block or delete own staff account', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->deleteJson('/api/v1/staff/'.$admin->id)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['id']);

    $this->actingAs($admin)
        ->postJson(route('api.v1.staff.block', $admin->id))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['id']);
});

test('directeur cannot manage staff', function () {
    $directeur = User::factory()->directeur()->create();

    $this->actingAs($directeur)
        ->getJson('/api/v1/staff')
        ->assertForbidden();
});

test('blocked user cannot log in via api', function () {
    $school = School::factory()->create(['domain' => 'blocked-school']);
    $user = User::factory()->enseignant()->create([
        'school_id' => $school->id,
        'email' => 'bloque@example.test',
        'password' => 'password',
        'blocked_at' => now(),
    ]);

    $this->postJson('/api/v1/login', [
        'domain' => 'blocked-school',
        'email' => $user->email,
        'password' => 'password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});
