<?php

use App\Models\AcademicYear;
use App\Models\School;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Inertia\Testing\AssertableInertia as Assert;


test('school registration screen can be rendered', function () {
    $this->get(route('register'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('auth/register-school'));
});

test('a school can self-register with an admin account', function () {
    $response = $this->post(route('register.store'), [
        'schoolName' => 'École Belle Vue',
        'domain' => 'belle-vue',
        'city' => 'Pointe-Noire',
        'phone' => '06 111 22 33',
        'adminName' => 'Jean Malonga',
        'adminEmail' => 'direction@bellevue.cg',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticated();

    $school = School::query()->where('domain', 'belle-vue')->first();

    expect($school)->not->toBeNull()
        ->and($school?->name)->toBe('École Belle Vue')
        ->and($school?->status)->toBe('active');

    $user = User::query()->where('email', 'direction@bellevue.cg')->first();

    expect($user)->not->toBeNull()
        ->and($user?->school_id)->toBe($school?->id)
        ->and($user?->role->value)->toBe('admin')
        ->and($school?->profile?->city)->toBe('Pointe-Noire')
        ->and($school?->subscription)->not->toBeNull();

    CurrentSchool::set($school);

    expect(AcademicYear::query()->where('school_id', $school->id)->count())->toBe(1)
        ->and(AcademicYear::query()->where('school_id', $school->id)->where('is_current', true)->exists())->toBeTrue();

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('catalog.profile.name', 'École Belle Vue')
            ->where('catalog.students', [])
            ->where('catalog.teachers', [])
            ->where('catalog.announcements', [])
            ->has('catalog.academicYears', 1)
        );
});

test('school registration rejects a taken domain', function () {
    defaultSchool();

    $this->post(route('register.store'), [
        'schoolName' => 'Autre école',
        'domain' => 'palmiers',
        'adminName' => 'Admin',
        'adminEmail' => 'autre@example.test',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertSessionHasErrors('domain');

    $this->assertGuest();
});

test('legacy fortify user registration remains unavailable', function () {
    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertSessionHasErrors(['schoolName', 'domain', 'adminName', 'adminEmail']);
});
