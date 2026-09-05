<?php

namespace App\Models;

use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
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
])]
class SchoolSubscription extends Model
{
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
     * @return array{
     *     plan: string,
     *     status: string,
     *     seats: int,
     *     usedSeats: int,
     *     renewsOn: string,
     *     monthlyAmount: int,
     *     receipts: list<array{
     *         id: string,
     *         reference: string,
     *         periodLabel: string,
     *         paidOn: string|null,
     *         amount: int,
     *         plan: string,
     *         method: string,
     *         status: string
     *     }>
     * }
     */
    public function toApiArray(): array
    {
        return [
            'plan' => $this->plan->value,
            'status' => $this->status->value,
            'seats' => $this->seats,
            'usedSeats' => $this->used_seats,
            'renewsOn' => $this->renews_on->format('Y-m-d'),
            'monthlyAmount' => $this->monthly_amount,
            'receipts' => $this->relationLoaded('receipts')
                ? $this->receipts->map->toApiArray()->values()->all()
                : [],
        ];
    }
}
