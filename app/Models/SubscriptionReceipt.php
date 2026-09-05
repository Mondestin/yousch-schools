<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionPlan;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_subscription_id
 * @property string $reference
 * @property string $period_label
 * @property Carbon|null $paid_on
 * @property int $amount
 * @property SubscriptionPlan $plan
 * @property PaymentMethod $method
 * @property PaymentStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_subscription_id',
    'reference',
    'period_label',
    'paid_on',
    'amount',
    'plan',
    'method',
    'status',
])]
class SubscriptionReceipt extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'paid_on' => 'date',
            'amount' => 'integer',
            'plan' => SubscriptionPlan::class,
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
        ];
    }

    /**
     * @return BelongsTo<SchoolSubscription, $this>
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(SchoolSubscription::class, 'school_subscription_id');
    }

    /**
     * @return array{
     *     id: string,
     *     reference: string,
     *     periodLabel: string,
     *     paidOn: string|null,
     *     amount: int,
     *     plan: string,
     *     method: string,
     *     status: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'periodLabel' => $this->period_label,
            'paidOn' => $this->paid_on?->format('Y-m-d'),
            'amount' => $this->amount,
            'plan' => $this->plan->value,
            'method' => $this->method->value,
            'status' => $this->status->value,
        ];
    }
}
