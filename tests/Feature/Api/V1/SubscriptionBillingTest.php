<?php

use App\Enums\PaymentStatus;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Enums\SubscriptionValidationStatus;
use App\Models\SchoolSubscription;
use App\Models\SubscriptionReceipt;
use App\Models\User;
use App\Notifications\SubscriptionPaymentSubmittedNotification;
use App\Support\Billing\SubscriptionCatalog;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

test('admin can update subscription plan billing payment and cancel', function () {
    Notification::fake();

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
        'billing_email' => 'facturation@example.test',
        'billing_name' => 'École Test',
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
            'transactionId' => 'MP250914.AIRT.998877',
        ])
        ->assertOk()
        ->assertJsonPath('data.payment.provider', 'airtel')
        ->assertJsonPath('data.payment.phone', config('billing.mobile_money.airtel'))
        ->assertJsonPath('data.receipts.0.transactionId', 'MP250914.AIRT.998877')
        ->assertJsonPath('data.receipts.0.status', 'impaye')
        ->assertJsonPath('data.receipts.0.validationStatus', 'en_attente')
        ->assertJsonPath('data.billingAlert.code', 'pending_validation');

    Notification::assertSentOnDemand(SubscriptionPaymentSubmittedNotification::class);

    $this->actingAs($admin)
        ->putJson('/api/v1/subscription/payment', [
            'provider' => 'airtel',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['transactionId']);

    $this->actingAs($admin)
        ->postJson('/api/v1/subscription/cancel')
        ->assertOk()
        ->assertJsonPath('data.status', 'canceled');
});

test('admin can resubmit transaction id on an existing receipt', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $subscriptionId = (string) Str::ulid();
    $receiptId = (string) Str::ulid();

    SchoolSubscription::query()->create([
        'id' => $subscriptionId,
        'school_id' => $admin->school_id,
        'plan' => SubscriptionPlan::Gold,
        'status' => SubscriptionStatus::Active,
        'seats' => 10,
        'used_seats' => 1,
        'renews_on' => now()->addMonth()->toDateString(),
        'monthly_amount' => 25000,
        'billing_period' => 'monthly',
        'billing_email' => 'billing@example.test',
        'payment_provider' => 'mtn',
        'payment_phone' => config('billing.mobile_money.mtn'),
    ]);

    SubscriptionReceipt::query()->create([
        'id' => $receiptId,
        'school_id' => $admin->school_id,
        'school_subscription_id' => $subscriptionId,
        'reference' => 'YS-2026-TEST',
        'period_label' => 'Septembre 2026',
        'paid_on' => null,
        'amount' => 25000,
        'plan' => SubscriptionPlan::Gold,
        'method' => 'mtn_money',
        'status' => PaymentStatus::Impaye,
        'transaction_id' => 'OLD-TXN',
        'validation_status' => SubscriptionValidationStatus::Rejete,
    ]);

    $this->actingAs($admin)
        ->putJson("/api/v1/subscription/receipts/{$receiptId}/transaction", [
            'transactionId' => 'NEW-TXN-441122',
        ])
        ->assertOk()
        ->assertJsonPath('data.receipts.0.transactionId', 'NEW-TXN-441122')
        ->assertJsonPath('data.receipts.0.validationStatus', 'en_attente')
        ->assertJsonPath('data.billingAlert.code', 'pending_validation');

    Notification::assertSentOnDemand(SubscriptionPaymentSubmittedNotification::class);
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
