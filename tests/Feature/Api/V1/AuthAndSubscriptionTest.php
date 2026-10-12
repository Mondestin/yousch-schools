<?php

use App\Enums\StaffRole;
use App\Models\PersonalAccessToken;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Notifications\LoginCodeNotification;
use App\Support\Auth\StaffAccess;
use Database\Seeders\SchoolStaffSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

test('api login sends email code then returns bearer token', function () {
    Notification::fake();

    $school = defaultSchool();
    $user = User::factory()->admin()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $challenge = $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => 'admin@example.test',
        'password' => 'password',
        'deviceName' => 'iphone-test',
    ])->assertOk()
        ->assertJsonPath('requiresVerification', true);

    $challengeToken = $challenge->json('challengeToken');
    expect($challengeToken)->toBeString()->not->toBeEmpty()
        ->and($challenge->json('token'))->toBeNull()
        ->and(PersonalAccessToken::query()->count())->toBe(0);

    $code = null;
    Notification::assertSentTo(
        $user,
        LoginCodeNotification::class,
        function (LoginCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return strlen($notification->code) === 4;
        },
    );

    $response = $this->postJson('/api/v1/login/verify', [
        'challengeToken' => $challengeToken,
        'code' => $code,
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

test('api login rejects bad credentials before sending a code', function () {
    Notification::fake();

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

    Notification::assertNothingSent();
});

test('api login verify rejects an incorrect code', function () {
    Notification::fake();

    $school = defaultSchool();
    $user = User::factory()->admin()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $challengeToken = $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => 'admin@example.test',
        'password' => 'password',
    ])->assertOk()
        ->json('challengeToken');

    $code = null;
    Notification::assertSentTo(
        $user,
        LoginCodeNotification::class,
        function (LoginCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        },
    );

    $wrongCode = $code === '0000' ? '1111' : '0000';

    $this->postJson('/api/v1/login/verify', [
        'challengeToken' => $challengeToken,
        'code' => $wrongCode,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['code']);

    expect(PersonalAccessToken::query()->count())->toBe(0);
});

test('api login resend issues a new code', function () {
    Notification::fake();

    $school = defaultSchool();
    $user = User::factory()->admin()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $firstToken = $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => 'admin@example.test',
        'password' => 'password',
    ])->assertOk()
        ->json('challengeToken');

    $secondToken = $this->postJson('/api/v1/login/resend', [
        'challengeToken' => $firstToken,
    ])->assertOk()
        ->assertJsonPath('requiresVerification', true)
        ->json('challengeToken');

    expect($secondToken)->toBeString()->not->toBe($firstToken);

    Notification::assertSentToTimes($user, LoginCodeNotification::class, 2);
});

test('api logout deletes the current access token', function () {
    $user = User::factory()->admin()->create([
        'email' => 'admin@example.test',
        'password' => 'password',
    ]);

    $token = apiLoginAs($user);

    $this->withToken($token)
        ->postJson('/api/v1/logout')
        ->assertOk();

    expect(PersonalAccessToken::query()->count())->toBe(0);

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertUnauthorized();
});

test('api password forgot sends reset mail and reset updates password', function () {
    Notification::fake();

    $school = defaultSchool();
    $user = User::factory()->eleve()->create([
        'email' => 'eleve-reset@example.test',
        'password' => 'password',
        'school_id' => $school->id,
    ]);

    $this->postJson('/api/v1/password/forgot', [
        'domain' => $school->domain,
        'email' => 'eleve-reset@example.test',
    ])->assertOk()
        ->assertJsonPath(
            'message',
            'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.',
        );

    $resetToken = null;
    Notification::assertSentTo(
        $user,
        ResetPassword::class,
        function (ResetPassword $notification) use (&$resetToken): bool {
            $resetToken = $notification->token;

            return is_string($notification->token) && $notification->token !== '';
        },
    );

    $bearer = apiLoginAs($user);
    expect(PersonalAccessToken::query()->count())->toBe(1);

    $this->postJson('/api/v1/password/reset', [
        'domain' => $school->domain,
        'email' => 'eleve-reset@example.test',
        'token' => $resetToken,
        'password' => 'NouveauMotDePasse1!',
        'passwordConfirmation' => 'NouveauMotDePasse1!',
    ])->assertOk()
        ->assertJsonPath('message', 'Mot de passe mis à jour. Vous pouvez vous connecter.');

    $user->refresh();
    expect(Hash::check('NouveauMotDePasse1!', $user->password))->toBeTrue()
        ->and(PersonalAccessToken::query()->count())->toBe(0);

    $this->withToken($bearer)
        ->getJson('/api/v1/me')
        ->assertUnauthorized();

    $newToken = apiLoginAs($user, 'NouveauMotDePasse1!');
    expect($newToken)->toBeString()->not->toBeEmpty();
});

test('api password forgot does not reveal unknown emails', function () {
    Notification::fake();

    $school = defaultSchool();

    $this->postJson('/api/v1/password/forgot', [
        'domain' => $school->domain,
        'email' => 'nobody@example.test',
    ])->assertOk()
        ->assertJsonPath(
            'message',
            'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.',
        );

    Notification::assertNothingSent();
});

test('directeur can read subscription but secretaire cannot', function () {
    $this->seed(SchoolStaffSeeder::class);

    $directeur = User::factory()->directeur()->create();
    $secretaire = User::factory()->secretaire()->create();

    $this->actingAs($directeur)
        ->getJson('/api/v1/subscription')
        ->assertOk()
        ->assertJsonPath('data.plan', 'titanium')
        ->assertJsonStructure([
            'data' => [
                'plan',
                'status',
                'seats',
                'usedSeats',
                'renewsOn',
                'monthlyAmount',
                'cycles',
                'cyclesLabel',
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
