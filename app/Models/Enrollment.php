<?php

namespace App\Models;

use App\Enums\EnrollmentStatus;
use App\Models\Concerns\BelongsToSchool;
use Database\Factories\EnrollmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $student_id
 * @property string $classroom_id
 * @property string $academic_year_id
 * @property string|null $track_id
 * @property EnrollmentStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'student_id',
    'classroom_id',
    'academic_year_id',
    'track_id',
    'status',
    'school_id',
])]
class Enrollment extends Model
{
    use BelongsToSchool;

    /** @use HasFactory<EnrollmentFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => EnrollmentStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
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
     *     studentId: string,
     *     classroomId: string,
     *     academicYearId: string,
     *     trackId: string|null,
     *     status: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'studentId' => $this->student_id,
            'classroomId' => $this->classroom_id,
            'academicYearId' => $this->academic_year_id,
            'trackId' => $this->track_id,
            'status' => $this->status->value,
        ];
    }
}
