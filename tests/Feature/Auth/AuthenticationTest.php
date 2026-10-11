<?php

use App\Models\School;
use App\Models\SchoolProfile;
use App\Models\User;
use App\Notifications\LoginCodeNotification;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Facades\Notification;
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

test('domain login screen shows the school logo above the name', function () {
    $this->seed(SchoolTaxonomySeeder::class);

    $school = defaultSchool();
    $profile = $school->profile()->withoutGlobalScopes()->first()
        ?? SchoolProfile::query()->withoutGlobalScopes()->create([
            'school_id' => $school->id,
            'name' => $school->name,
            'promoter_name' => 'Promoteur',
            'director_name' => 'Directeur',
            'city' => 'Brazzaville',
            'country' => 'Congo',
            'phone' => '0600000000',
            'email' => 'contact@'.$school->domain.'.cg',
            'address' => 'Avenue de la Paix',
            'motto' => 'Savoir',
            'currency' => 'FCFA',
        ]);

    $profile->forceFill([
        'logo_url' => '/storage/schools/'.$school->domain.'/school/logo.png',
    ])->save();

    $this->get(route('login.domain', ['domain' => $school->domain]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/login')
            ->where('school.name', $profile->name)
            ->where('school.logoUrl', '/storage/schools/'.$school->domain.'/school/logo.png'));
});

test('unknown domain returns 404', function () {
    $this->get(route('login.domain', ['domain' => 'inconnu-xyz']))
        ->assertNotFound();
});

test('users can authenticate using the domain login screen', function () {
    $user = schoolUser();

    webLoginAs($user);
});

test('users cannot authenticate against another school domain', function () {
    Notification::fake();

    schoolUser(['email' => 'a@example.com']);

    $schoolB = School::factory()->domain('autre-ecole')->create(['name' => 'Autre École']);

    $this->get(route('login.domain', ['domain' => $schoolB->domain]))->assertOk();

    $this->post(route('login.store'), [
        'email' => 'a@example.com',
        'password' => 'password',
    ]);

    $this->assertGuest();
    Notification::assertNothingSent();
});

test('password login redirects to email code challenge', function () {
    Notification::fake();

    $school = defaultSchool();
    $user = schoolUser();

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect(route('login.code'));

    $this->assertGuest();

    Notification::assertSentTo($user, LoginCodeNotification::class);

    $this->get(route('login.code'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/login-code')
            ->where('school.domain', $school->domain));
});

test('users with two factor enabled are redirected to two factor after email code', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

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

    $response = $this->post(route('login.code.store'), [
        'code' => $code,
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    Notification::fake();

    $school = defaultSchool();
    $user = schoolUser();

    $this->get(route('login.domain', ['domain' => $school->domain]))->assertOk();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
    Notification::assertNothingSent();
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
