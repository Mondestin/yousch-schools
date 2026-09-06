<?php

use App\Models\School;
use App\Models\User;
use Laravel\Fortify\Features;

test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});

test('domain login screen can be rendered', function () {
    $school = defaultSchool();

    $response = $this->get(route('login.domain', ['domain' => $school->domain]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('auth/login')
        ->where('school.domain', $school->domain));
});

test('unknown domain returns 404', function () {
    $this->get(route('login.domain', ['domain' => 'inconnu-xyz']))
        ->assertNotFound();
});

test('users can authenticate using the domain login screen', function () {
    $school = defaultSchool();
    $user = schoolUser();

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users cannot authenticate against another school domain', function () {
    schoolUser(['email' => 'a@example.com']);

    $schoolB = School::factory()->domain('autre-ecole')->create(['name' => 'Autre École']);

    $this->get(route('login.domain', ['domain' => $schoolB->domain]))->assertOk();

    $this->post(route('login.store'), [
        'email' => 'a@example.com',
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('users with two factor enabled are redirected to two factor challenge', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $school = defaultSchool();
    $user = User::factory()->withTwoFactor()->create([
        'school_id' => $school->id,
    ]);

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $school = defaultSchool();
    $user = schoolUser();

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = schoolUser();

    $response = $this->actingAs($user)->post(route('logout'));

    $response->assertRedirect(route('home'));

    $this->assertGuest();
});

test('users are rate limited', function () {
    $school = defaultSchool();
    $user = schoolUser();

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});
