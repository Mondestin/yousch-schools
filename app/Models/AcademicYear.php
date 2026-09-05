<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $label
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property bool $is_current
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'label',
    'starts_on',
    'ends_on',
    'is_current',
])]
class AcademicYear extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'is_current' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Term, $this>
     */
    public function terms(): HasMany
    {
        return $this->hasMany(Term::class);
    }

    /**
     * @return HasMany<Classroom, $this>
     */
    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    /**
     * @return array{
     *     id: string,
     *     label: string,
     *     startsOn: string,
     *     endsOn: string,
     *     isCurrent: bool
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'startsOn' => $this->starts_on->format('Y-m-d'),
            'endsOn' => $this->ends_on->format('Y-m-d'),
            'isCurrent' => $this->is_current,
        ];
    }
}
