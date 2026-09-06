<?php

namespace App\Models;

use App\Enums\Gender;
use App\Models\Concerns\BelongsToSchool;
use App\Models\Contracts\HasDossierDocuments;
use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $matricule
 * @property string $first_name
 * @property string $last_name
 * @property Gender $gender
 * @property Carbon $born_on
 * @property string $city
 * @property string $neighborhood
 * @property string|null $address
 * @property string|null $phone
 * @property string|null $email
 * @property Carbon $enrolled_on
 * @property string|null $photo_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * @implements HasDossierDocuments<$this>
 */
#[Fillable([
    'id',
    'matricule',
    'first_name',
    'last_name',
    'gender',
    'born_on',
    'city',
    'neighborhood',
    'address',
    'phone',
    'email',
    'enrolled_on',
    'photo_url',
    'school_id',
])]
class Student extends Model implements HasDossierDocuments
{
    use BelongsToSchool;

    /** @use HasFactory<StudentFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'born_on' => 'date',
            'enrolled_on' => 'date',
        ];
    }

    /**
     * @return BelongsToMany<Guardian, $this>
     */
    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'student_guardian')
            ->withPivot('relation')
            ->withTimestamps();
    }

    /**
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function dossierFiles(): MorphMany
    {
        return $this->morphMany(DossierFile::class, 'fileable');
    }

    /**
     * @return array{
     *     id: string,
     *     matricule: string,
     *     firstName: string,
     *     lastName: string,
     *     gender: string,
     *     bornOn: string,
     *     city: string,
     *     neighborhood: string,
     *     address: string|null,
     *     phone: string|null,
     *     email: string|null,
     *     enrolledOn: string,
     *     photoUrl: string|null,
     *     files?: list<array{id: string, name: string, url: string, mime: string}>
     * }
     */
    public function toApiArray(): array
    {
        $payload = [
            'id' => $this->id,
            'matricule' => $this->matricule,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'gender' => $this->gender->value,
            'bornOn' => $this->born_on->format('Y-m-d'),
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'enrolledOn' => $this->enrolled_on->format('Y-m-d'),
            'photoUrl' => $this->photo_url,
        ];

        if ($this->relationLoaded('dossierFiles')) {
            $payload['files'] = array_values(
                $this->dossierFiles->map->toApiArray()->all(),
            );
        }

        return $payload;
    }
}
