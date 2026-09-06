<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $enrollment_id
 * @property string $month
 * @property int $amount
 * @property int $expected_amount
 * @property PaymentStatus $status
 * @property Carbon|null $paid_on
 * @property PaymentMethod|null $method
 */
#[Fillable([
    'id',
    'enrollment_id',
    'month',
    'amount',
    'expected_amount',
    'status',
    'paid_on',
    'method',
    'school_id',
])]
class Payment extends Model
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
            'amount' => 'integer',
            'expected_amount' => 'integer',
            'status' => PaymentStatus::class,
            'paid_on' => 'date',
            'method' => PaymentMethod::class,
        ];
    }

    /**
     * @return BelongsTo<Enrollment, $this>
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * @return array{
     *     id: string,
     *     enrollmentId: string,
     *     month: string,
     *     amount: int,
     *     expectedAmount: int,
     *     status: string,
     *     paidOn: string|null,
     *     method: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'enrollmentId' => $this->enrollment_id,
            'month' => $this->month,
            'amount' => $this->amount,
            'expectedAmount' => $this->expected_amount,
            'status' => $this->status->value,
            'paidOn' => $this->paid_on?->format('Y-m-d'),
            'method' => $this->method?->value,
        ];
    }
}
