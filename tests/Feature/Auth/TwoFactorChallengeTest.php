<?php

use App\Models\User;
use App\Notifications\LoginCodeNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());
});

test('two factor challenge redirects to login when not authenticated', function () {
    $response = $this->get(route('two-factor.login'));

    $response->assertRedirect(route('login'));
});

test('two factor challenge can be rendered', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    Notification::fake();

    $school = defaultSchool();
    $user = User::factory()->withTwoFactor()->create([
        'school_id' => $school->id,
    ]);

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
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

    $this->post(route('login.code.store'), [
        'code' => $code,
    ])->assertRedirect(route('two-factor.login'));

    $this->get(route('two-factor.login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/two-factor-challenge'),
        );
});
