<?php

namespace App\Models;

use App\Enums\CashKind;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property Carbon $date
 * @property CashKind $kind
 * @property string $label
 * @property string|null $description
 * @property int $amount
 * @property PaymentMethod $method
 */
#[Fillable([
    'id',
    'date',
    'kind',
    'label',
    'description',
    'amount',
    'method',
])]
class CashMovement extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'kind' => CashKind::class,
            'amount' => 'integer',
            'method' => PaymentMethod::class,
        ];
    }

    /**
     * @return array{
     *     id: string,
     *     date: string,
     *     kind: string,
     *     label: string,
     *     description: string|null,
     *     amount: int,
     *     method: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date->format('Y-m-d'),
            'kind' => $this->kind->value,
            'label' => $this->label,
            'description' => $this->description,
            'amount' => $this->amount,
            'method' => $this->method->value,
        ];
    }
}
