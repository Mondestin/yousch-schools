<?php

namespace App\Models;

use App\Enums\MentionCode;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property MentionCode $code
 * @property string $label
 * @property string $min
 * @property string $max
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'code',
    'label',
    'min',
    'max',
])]
class Mention extends Model
{
    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'code' => MentionCode::class,
            'min' => 'decimal:2',
            'max' => 'decimal:2',
        ];
    }

    /**
     * @return array{
     *     code: string,
     *     label: string,
     *     min: float,
     *     max: float
     * }
     */
    public function toApiArray(): array
    {
        return [
            'code' => $this->code->value,
            'label' => $this->label,
            'min' => (float) $this->min,
            'max' => (float) $this->max,
        ];
    }
}
