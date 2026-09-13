<?php

use App\Models\School;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\Billing\SubscriptionCatalog;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
