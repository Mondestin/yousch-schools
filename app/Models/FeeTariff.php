<?php

namespace App\Models;

use App\Enums\Cycle;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property Cycle $cycle
 * @property int $monthly_amount
 * @property int $enrollment_amount
 * @property int $re_enrollment_amount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'cycle',
    'monthly_amount',
    'enrollment_amount',
    're_enrollment_amount',
])]
class FeeTariff extends Model
{
    use HasUlids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cycle' => Cycle::class,
            'monthly_amount' => 'integer',
            'enrollment_amount' => 'integer',
            're_enrollment_amount' => 'integer',
        ];
    }

    /**
     * @return array{
     *     cycle: string,
     *     monthlyAmount: int,
     *     enrollmentAmount: int,
     *     reEnrollmentAmount: int
     * }
     */
    public function toApiArray(): array
    {
        return [
            'cycle' => $this->cycle->value,
            'monthlyAmount' => $this->monthly_amount,
            'enrollmentAmount' => $this->enrollment_amount,
            'reEnrollmentAmount' => $this->re_enrollment_amount,
        ];
    }
}
