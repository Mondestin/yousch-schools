<?php

namespace App\Models;

use App\Enums\Weekday;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $academic_year_id
 * @property string $classroom_id
 * @property Weekday $weekday
 * @property string $period_id
 * @property string $subject_id
 * @property string $teacher_id
 * @property string|null $room
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'academic_year_id',
    'classroom_id',
    'weekday',
    'period_id',
    'subject_id',
    'teacher_id',
    'room',
])]
class TimetableSlot extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weekday' => Weekday::class,
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
     * @return BelongsTo<Teacher, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    /**
     * @return HasMany<AttendanceMark, $this>
     */
    public function attendanceMarks(): HasMany
    {
        return $this->hasMany(AttendanceMark::class, 'slot_id');
    }

    /**
     * @return array{
     *     id: string,
     *     academicYearId: string,
     *     classroomId: string,
     *     weekday: string,
     *     periodId: string,
     *     subjectId: string,
     *     teacherId: string,
     *     room: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'academicYearId' => $this->academic_year_id,
            'classroomId' => $this->classroom_id,
            'weekday' => $this->weekday->value,
            'periodId' => $this->period_id,
            'subjectId' => $this->subject_id,
            'teacherId' => $this->teacher_id,
            'room' => $this->room,
        ];
    }
}
