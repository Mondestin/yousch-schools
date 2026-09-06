<?php

namespace App\Models;

use App\Enums\AdmissionStatus;
use App\Enums\Cycle;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Models\Concerns\BelongsToSchool;
use App\Models\Contracts\HasDossierFiles;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $academic_year_id
 * @property Cycle $cycle
 * @property string $classroom_id
 * @property string|null $track_id
 * @property Carbon $submitted_on
 * @property AdmissionStatus $status
 * @property string $first_name
 * @property string $last_name
 * @property Gender $gender
 * @property Carbon $born_on
 * @property string $city
 * @property string $neighborhood
 * @property string|null $address
 * @property string|null $phone
 * @property string $guardian_last_name
 * @property string $guardian_first_name
 * @property string $guardian_phone
 * @property GuardianRelation $guardian_relation
 * @property string|null $notes
 * @property string|null $student_id
 *
 * @implements HasDossierFiles<$this>
 */
#[Fillable([
    'id',
    'academic_year_id',
    'cycle',
    'classroom_id',
    'track_id',
    'submitted_on',
    'status',
    'first_name',
    'last_name',
    'gender',
    'born_on',
    'city',
    'neighborhood',
    'address',
    'phone',
    'guardian_last_name',
    'guardian_first_name',
    'guardian_phone',
    'guardian_relation',
    'notes',
    'student_id',
    'school_id',
])]
class Admission extends Model implements HasDossierFiles
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
            'status' => AdmissionStatus::class,
            'gender' => Gender::class,
            'guardian_relation' => GuardianRelation::class,
            'submitted_on' => 'date',
            'born_on' => 'date',
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
            'cycle' => $this->cycle->value,
            'classroomId' => $this->classroom_id,
            'trackId' => $this->track_id,
            'submittedOn' => $this->submitted_on->format('Y-m-d'),
            'status' => $this->status->value,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'gender' => $this->gender->value,
            'bornOn' => $this->born_on->format('Y-m-d'),
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'address' => $this->address,
            'phone' => $this->phone,
            'guardianLastName' => $this->guardian_last_name,
            'guardianFirstName' => $this->guardian_first_name,
            'guardianPhone' => $this->guardian_phone,
            'guardianRelation' => $this->guardian_relation->value,
            'notes' => $this->notes,
            'studentId' => $this->student_id,
        ];

        if ($this->relationLoaded('files')) {
            $payload['files'] = $this->files->map->toApiArray()->values()->all();
        }

        return $payload;
    }
}
