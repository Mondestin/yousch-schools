<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $enrollment_id
 * @property string $assessment_id
 * @property string $subject_id
 * @property string $score
 */
#[Fillable([
    'id',
    'enrollment_id',
    'assessment_id',
    'subject_id',
    'score',
    'school_id',
])]
class Grade extends Model
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
            'score' => 'decimal:2',
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
     * @return BelongsTo<Assessment, $this>
     */
    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * @return array{
     *     id: string,
     *     enrollmentId: string,
     *     assessmentId: string,
     *     subjectId: string,
     *     score: float
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'enrollmentId' => $this->enrollment_id,
            'assessmentId' => $this->assessment_id,
            'subjectId' => $this->subject_id,
            'score' => (float) $this->score,
        ];
    }
}
