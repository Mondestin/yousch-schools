<?php

use App\Models\School;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Notifications\LoginCodeNotification;
use App\Support\Billing\SubscriptionCatalog;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->beforeEach(function () {
    defaultSchool();
})->in('Feature');

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

function defaultSchool(): School
{
    /** @var School $school */
    $school = School::query()->first() ?? School::factory()->domain('palmiers')->create([
        'name' => 'Complexe Scolaire Les Palmiers',
    ]);

    CurrentSchool::set($school);

    return $school;
}

/**
 * Ensure the current tenant has an active subscription on the given plan.
 */
function setSubscriptionPlan(string $plan = 'titanium'): SchoolSubscription
{
    $school = defaultSchool();
    $offer = SubscriptionCatalog::offer($plan);

    /** @var SchoolSubscription|null $existing */
    $existing = SchoolSubscription::query()
        ->where('school_id', $school->id)
        ->first();

    if ($existing !== null) {
        $existing->update([
            'plan' => $plan,
            'status' => 'active',
            'seats' => $offer['seats'],
            'monthly_amount' => $offer['monthlyAmount'],
        ]);

        return $existing->fresh();
    }

    return SchoolSubscription::query()->create([
        'id' => (string) Str::ulid(),
        'school_id' => $school->id,
        'plan' => $plan,
        'status' => 'active',
        'seats' => $offer['seats'],
        'used_seats' => 1,
        'renews_on' => now()->addMonth()->toDateString(),
        'monthly_amount' => $offer['monthlyAmount'],
        'billing_period' => 'monthly',
    ]);
}

function schoolUser(array $attributes = []): User
{
    $school = defaultSchool();

    return User::factory()->create([
        'school_id' => $school->id,
        ...$attributes,
    ]);
}

/**
 * Complete the web 2-step login (password → e-mail code) and assert authentication.
 */
function webLoginAs(User $user, string $password = 'password'): void
{
    Notification::fake();

    $school = $user->school ?? defaultSchool();

    test()->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    test()->post(route('login.store'), [
        'email' => $user->email,
        'password' => $password,
    ])->assertRedirect(route('login.code'));

    $code = null;

    Notification::assertSentTo(
        $user,
        LoginCodeNotification::class,
        function (LoginCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        },
    );

    expect($code)->toBeString()->toHaveLength(4);

    test()->post(route('login.code.store'), [
        'code' => $code,
    ])->assertRedirect(route('dashboard', absolute: false));

    test()->assertAuthenticatedAs($user);
}

/**
 * Complete the mobile 2-step login (password → e-mail code) and return the Bearer token.
 */
function apiLoginAs(User $user, string $password = 'password', ?string $deviceName = 'test'): string
{
    Notification::fake();

    $school = $user->school ?? defaultSchool();

    $challengeToken = test()->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => $user->email,
        'password' => $password,
        'deviceName' => $deviceName,
    ])->assertOk()
        ->assertJsonPath('requiresVerification', true)
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

    expect($code)->toBeString()->toHaveLength(4);

    return test()->postJson('/api/v1/login/verify', [
        'challengeToken' => $challengeToken,
        'code' => $code,
    ])->assertOk()
        ->assertJsonPath('tokenType', 'Bearer')
        ->json('token');
}