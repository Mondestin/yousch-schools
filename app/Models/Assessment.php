<?php

namespace App\Models;

use App\Enums\AssessmentType;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property AssessmentType $type
 * @property string $name
 * @property string $classroom_id
 * @property string $subject_id
 * @property string $term_id
 * @property Carbon $held_on
 * @property string $held_at
 * @property string $held_until
 */
#[Fillable([
    'id',
    'type',
    'name',
    'classroom_id',
    'subject_id',
    'term_id',
    'held_on',
    'held_at',
    'held_until',
    'school_id',
])]
class Assessment extends Model
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
            'type' => AssessmentType::class,
            'held_on' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * @return BelongsTo<Term, $this>
     */
    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    /**
     * @return HasMany<Grade, $this>
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * @return array{
     *     id: string,
     *     type: string,
     *     name: string,
     *     classroomId: string,
     *     subjectId: string,
     *     termId: string,
     *     heldOn: string,
     *     heldAt: string,
     *     heldUntil: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'name' => $this->name,
            'classroomId' => $this->classroom_id,
            'subjectId' => $this->subject_id,
            'termId' => $this->term_id,
            'heldOn' => $this->held_on->format('Y-m-d'),
            'heldAt' => $this->held_at,
            'heldUntil' => $this->held_until,
        ];
    }
}
