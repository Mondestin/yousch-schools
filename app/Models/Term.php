<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $academic_year_id
 * @property string $name
 * @property int $position
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'academic_year_id',
    'name',
    'position',
    'starts_on',
    'ends_on',
    'school_id',
])]
class Term extends Model
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
            'position' => 'integer',
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return array{
     *     id: string,
     *     academicYearId: string,
     *     name: string,
     *     position: int,
     *     startsOn: string,
     *     endsOn: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'academicYearId' => $this->academic_year_id,
            'name' => $this->name,
            'position' => $this->position,
            'startsOn' => $this->starts_on->format('Y-m-d'),
            'endsOn' => $this->ends_on->format('Y-m-d'),
        ];
    }
}
