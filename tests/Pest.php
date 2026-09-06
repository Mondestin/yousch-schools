<?php

use App\Models\School;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

function schoolUser(array $attributes = []): User
{
    $school = defaultSchool();

    return User::factory()->create([
        'school_id' => $school->id,
        ...$attributes,
    ]);
}
