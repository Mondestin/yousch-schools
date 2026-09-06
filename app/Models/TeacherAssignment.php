<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Database\Factories\TeacherAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $teacher_id
 * @property string $academic_year_id
 * @property string $classroom_id
 * @property string $subject_id
 * @property string|null $track_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'teacher_id',
    'academic_year_id',
    'classroom_id',
    'subject_id',
    'track_id',
    'school_id',
])]
class TeacherAssignment extends Model
{
    use BelongsToSchool;

    /** @use HasFactory<TeacherAssignmentFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return BelongsTo<Teacher, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
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
     * @return BelongsTo<Track, $this>
     */
    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class);
    }

    /**
     * @return array{
     *     id: string,
     *     teacherId: string,
     *     academicYearId: string,
     *     classroomId: string,
     *     subjectId: string,
     *     trackId: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'teacherId' => $this->teacher_id,
            'academicYearId' => $this->academic_year_id,
            'classroomId' => $this->classroom_id,
            'subjectId' => $this->subject_id,
            'trackId' => $this->track_id,
        ];
    }
}
