<?php

use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\Billing\SubscriptionCatalog;
use Illuminate\Support\Str;

test('admin can update subscription plan billing payment and cancel', function () {
    $admin = User::factory()->admin()->create();

    SchoolSubscription::query()->create([
        'id' => (string) Str::ulid(),
        'school_id' => $admin->school_id,
        'plan' => SubscriptionPlan::Gold,
        'status' => SubscriptionStatus::Active,
        'seats' => 10,
        'used_seats' => 1,
        'renews_on' => now()->addMonth()->toDateString(),
        'monthly_amount' => 25000,
        'billing_period' => 'monthly',
    ]);

    $this->actingAs($admin)
        ->putJson('/api/v1/subscription/plan', [
            'plan' => 'platinium',
            'period' => 'annual',
        ])
        ->assertOk()
        ->assertJsonPath('data.plan', 'platinium')
        ->assertJsonPath('data.billingPeriod', 'annual')
        ->assertJsonPath('data.seats', SubscriptionCatalog::seatsFor('platinium'))
        ->assertJsonPath(
            'data.monthlyAmount',
            SubscriptionCatalog::amountForPeriod('platinium', 'annual'),
        )
        ->assertJsonPath('data.cycles', SubscriptionCatalog::cyclesFor('platinium'));

    $this->actingAs($admin)
        ->putJson('/api/v1/subscription/billing', [
            'name' => 'École Test',
            'email' => 'facturation@example.test',
            'address' => 'Avenue de la Paix',
            'city' => 'Brazzaville',
            'country' => 'République du Congo',
            'vat' => 'CG-123',
        ])
        ->assertOk()
        ->assertJsonPath('data.billing.email', 'facturation@example.test')
        ->assertJsonPath('data.billing.vat', 'CG-123');

    $this->actingAs($admin)
        ->putJson('/api/v1/subscription/payment', [
            'provider' => 'airtel',
            'phone' => '+242061234567',
        ])
        ->assertOk()
        ->assertJsonPath('data.payment.provider', 'airtel')
        ->assertJsonPath('data.payment.phone', '+242061234567');

    $this->actingAs($admin)
        ->postJson('/api/v1/subscription/cancel')
        ->assertOk()
        ->assertJsonPath('data.status', 'canceled');
});

test('staff create is blocked when subscription seats are full', function () {
    $admin = User::factory()->admin()->create();

    SchoolSubscription::query()->create([
        'id' => (string) Str::ulid(),
        'school_id' => $admin->school_id,
        'plan' => SubscriptionPlan::Gold,
        'status' => SubscriptionStatus::Active,
        'seats' => 1,
        'used_seats' => 1,
        'renews_on' => now()->addMonth()->toDateString(),
        'monthly_amount' => 25000,
        'billing_period' => 'monthly',
    ]);

    $this->actingAs($admin)
        ->postJson('/api/v1/staff', [
            'name' => 'Trop De Monde',
            'email' => 'trop@example.test',
            'phone' => '06 500 00 99',
            'role' => 'secretaire',
            'cycles' => ['primaire'],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});
