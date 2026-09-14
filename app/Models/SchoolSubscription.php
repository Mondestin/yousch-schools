<?php

namespace App\Models;

use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Models\Concerns\BelongsToSchool;
use App\Support\Billing\SubscriptionBillingAlert;
use App\Support\Billing\SubscriptionCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property SubscriptionPlan $plan
 * @property SubscriptionStatus $status
 * @property int $seats
 * @property int $used_seats
 * @property Carbon $renews_on
 * @property int $monthly_amount
 * @property string $billing_period
 * @property string|null $billing_name
 * @property string|null $billing_email
 * @property string|null $billing_address
 * @property string|null $billing_city
 * @property string|null $billing_country
 * @property string|null $billing_vat
 * @property string|null $payment_provider
 * @property string|null $payment_phone
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'plan',
    'status',
    'seats',
    'used_seats',
    'renews_on',
    'monthly_amount',
    'billing_period',
    'billing_name',
    'billing_email',
    'billing_address',
    'billing_city',
    'billing_country',
    'billing_vat',
    'payment_provider',
    'payment_phone',
    'school_id',
])]
class SchoolSubscription extends Model
{
    use BelongsToSchool;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'plan' => SubscriptionPlan::class,
            'status' => SubscriptionStatus::class,
            'renews_on' => 'date',
            'seats' => 'integer',
            'used_seats' => 'integer',
            'monthly_amount' => 'integer',
        ];
    }

    /**
     * @return HasMany<SubscriptionReceipt, $this>
     */
    public function receipts(): HasMany
    {
        return $this->hasMany(SubscriptionReceipt::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        $offer = SubscriptionCatalog::offer($this->plan);

        return [
            'plan' => $this->plan->value,
            'status' => $this->status->value,
            'seats' => $this->seats,
            'usedSeats' => $this->used_seats,
            'renewsOn' => $this->renews_on->format('Y-m-d'),
            'monthlyAmount' => $this->monthly_amount,
            'billingPeriod' => $this->billing_period ?: 'monthly',
            'cycles' => $offer['cycles'],
            'cyclesLabel' => $offer['cyclesLabel'],
            'billing' => [
                'name' => $this->billing_name,
                'email' => $this->billing_email,
                'address' => $this->billing_address,
                'city' => $this->billing_city,
                'country' => $this->billing_country,
                'vat' => $this->billing_vat,
            ],
            'payment' => $this->payment_provider || $this->payment_phone
                ? [
                    'provider' => $this->payment_provider,
                    'phone' => $this->payment_phone,
                ]
                : null,
            'billingAlert' => SubscriptionBillingAlert::for($this),
            'receipts' => $this->relationLoaded('receipts')
                ? array_values($this->receipts->map->toApiArray()->all())
                : [],
        ];
    }
}
