<?php

namespace App\Models;

use App\Enums\Cycle;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $academic_year_id
 * @property Cycle $cycle
 * @property string $grade_level_id
 * @property string|null $track_id
 * @property string $code
 * @property string $name
 * @property string|null $section
 * @property int $capacity
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'academic_year_id',
    'cycle',
    'grade_level_id',
    'track_id',
    'code',
    'name',
    'section',
    'capacity',
    'school_id',
])]
class Classroom extends Model
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
            'cycle' => Cycle::class,
            'capacity' => 'integer',
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
     * @return BelongsTo<GradeLevel, $this>
     */
    public function gradeLevel(): BelongsTo
    {
        return $this->belongsTo(GradeLevel::class);
    }

    /**
     * @return BelongsTo<Track, $this>
     */
    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class);
    }

    /**
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * @return array{
     *     id: string,
     *     academicYearId: string,
     *     cycle: string,
     *     gradeLevelId: string,
     *     trackId: string|null,
     *     code: string,
     *     name: string,
     *     section: string|null,
     *     capacity: int
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'academicYearId' => $this->academic_year_id,
            'cycle' => $this->cycle->value,
            'gradeLevelId' => $this->grade_level_id,
            'trackId' => $this->track_id,
            'code' => $this->code,
            'name' => $this->name,
            'section' => $this->section,
            'capacity' => $this->capacity,
        ];
    }
}
