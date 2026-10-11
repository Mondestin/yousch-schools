<?php

use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\Student;
use App\Support\Tenancy\CurrentSchool;

test('school data is isolated between tenants', function () {
    $schoolA = defaultSchool();

    Student::query()->create([
        'id' => 'stu-a',
        'matricule' => 'A-001',
        'first_name' => 'Ada',
        'last_name' => 'A',
        'gender' => 'femme',
        'born_on' => '2015-01-01',
        'city' => 'Brazzaville',
        'neighborhood' => 'Centre',
        'enrolled_on' => '2026-09-01',
        'school_id' => $schoolA->id,
    ]);

    $schoolB = School::factory()->domain('ecole-b')->create();
    CurrentSchool::set($schoolB);

    Student::query()->create([
        'id' => 'stu-b',
        'matricule' => 'B-001',
        'first_name' => 'Béatrice',
        'last_name' => 'B',
        'gender' => 'femme',
        'born_on' => '2015-01-01',
        'city' => 'Pointe-Noire',
        'neighborhood' => 'Centre',
        'enrolled_on' => '2026-09-01',
        'school_id' => $schoolB->id,
    ]);

    CurrentSchool::set($schoolA);
    expect(Student::query()->pluck('id')->all())->toBe(['stu-a']);

    CurrentSchool::set($schoolB);
    expect(Student::query()->pluck('id')->all())->toBe(['stu-b']);

    expect(
        Student::query()->withoutGlobalScope(SchoolScope::class)->count(),
    )->toBe(2);
});

test('resolving a domain stores the school in session', function () {
    $school = defaultSchool();

    $this->post(route('login.domain.resolve'), [
        'domain' => $school->domain,
    ])->assertRedirect(route('login.domain', ['domain' => $school->domain]));
});

test('api login requires a school domain', function () {
    $school = defaultSchool();
    $user = schoolUser(['email' => 'api@example.com', 'password' => 'password']);

    $this->postJson('/api/v1/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertUnprocessable();

    $token = apiLoginAs($user);

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('school.domain', $school->domain);
});

test('session login can open dashboard after clearing pending school id', function () {
    $school = defaultSchool();
    $user = schoolUser();

    webLoginAs($user);

    session()->forget(['login.school_id', 'login.school_domain']);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard'));

    $this->get(route('login'))->assertRedirect(route('dashboard', absolute: false));
});
