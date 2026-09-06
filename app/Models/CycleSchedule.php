<?php

namespace App\Models;

use App\Enums\Cycle;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property Cycle $cycle
 * @property array<string, mixed> $hours
 * @property list<array<string, mixed>> $periods
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'cycle',
    'hours',
    'periods',
    'school_id',
])]
class CycleSchedule extends Model
{
    use BelongsToSchool;
    use HasUlids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cycle' => Cycle::class,
            'hours' => 'array',
            'periods' => 'array',
        ];
    }

    /**
     * @return array{
     *     cycle: string,
     *     hours: array<string, mixed>,
     *     periods: list<array<string, mixed>>
     * }
     */
    public function toApiArray(): array
    {
        return [
            'cycle' => $this->cycle->value,
            'hours' => $this->hours,
            'periods' => $this->periods,
        ];
    }
}
