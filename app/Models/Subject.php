<?php

namespace App\Models;

use App\Enums\Cycle;
use App\Models\Concerns\BelongsToSchool;
use App\Models\Contracts\HasDossierFiles;
use Database\Factories\SubjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $code
 * @property string $name
 * @property string|null $textbook
 * @property string|null $coefficient
 * @property Cycle $cycle
 * @property string $grade_level_id
 * @property string|null $track_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * @implements HasDossierFiles<$this>
 */
#[Fillable([
    'id',
    'code',
    'name',
    'textbook',
    'coefficient',
    'cycle',
    'grade_level_id',
    'track_id',
    'school_id',
])]
class Subject extends Model implements HasDossierFiles
{
    use BelongsToSchool;

    /** @use HasFactory<SubjectFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cycle' => Cycle::class,
            'coefficient' => 'decimal:2',
        ];
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
     * @return HasMany<TeacherAssignment, $this>
     */
    public function teacherAssignments(): HasMany
    {
        return $this->hasMany(TeacherAssignment::class);
    }

    public function files(): MorphMany
    {
        return $this->morphMany(DossierFile::class, 'fileable');
    }

    /**
     * @return array{
     *     id: string,
     *     code: string,
     *     name: string,
     *     textbook: string|null,
     *     coefficient: float|null,
     *     cycle: string,
     *     gradeLevelId: string,
     *     trackId: string|null,
     *     files?: list<array{id: string, name: string, url: string, mime: string}>
     * }
     */
    public function toApiArray(): array
    {
        $payload = [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'textbook' => $this->textbook,
            'coefficient' => $this->coefficient !== null ? (float) $this->coefficient : null,
            'cycle' => $this->cycle->value,
            'gradeLevelId' => $this->grade_level_id,
            'trackId' => $this->track_id,
        ];

        if ($this->relationLoaded('files')) {
            $payload['files'] = array_values(
                $this->files->map->toApiArray()->all(),
            );
        }

        return $payload;
    }
}
