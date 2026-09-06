<?php

namespace App\Models;

use App\Enums\ReenrollmentStatus;
use App\Models\Contracts\HasDossierFiles;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $academic_year_id
 * @property string $student_id
 * @property string $previous_class
 * @property string $classroom_id
 * @property string|null $track_id
 * @property Carbon $submitted_on
 * @property ReenrollmentStatus $status
 * @property string|null $notes
 *
 * @implements HasDossierFiles<$this>
 */
#[Fillable([
    'id',
    'academic_year_id',
    'student_id',
    'previous_class',
    'classroom_id',
    'track_id',
    'submitted_on',
    'status',
    'notes',
])]
class Reenrollment extends Model implements HasDossierFiles
{
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReenrollmentStatus::class,
            'submitted_on' => 'date',
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

    public function files(): MorphMany
    {
        return $this->morphMany(DossierFile::class, 'fileable');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        $payload = [
            'id' => $this->id,
            'academicYearId' => $this->academic_year_id,
            'studentId' => $this->student_id,
            'previousClass' => $this->previous_class,
            'classroomId' => $this->classroom_id,
            'trackId' => $this->track_id,
            'submittedOn' => $this->submitted_on->format('Y-m-d'),
            'status' => $this->status->value,
            'notes' => $this->notes,
        ];

        if ($this->relationLoaded('files')) {
            $payload['files'] = $this->files->map->toApiArray()->values()->all();
        }

        return $payload;
    }
}
