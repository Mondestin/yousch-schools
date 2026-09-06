<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\TeacherStatus;
use App\Models\Contracts\HasDossierFiles;
use Database\Factories\TeacherFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $code
 * @property string $first_name
 * @property string $last_name
 * @property string $phone
 * @property Gender $gender
 * @property string $qualification
 * @property Carbon $hired_on
 * @property Carbon|null $born_on
 * @property string|null $email
 * @property string|null $address
 * @property string|null $position
 * @property string $city
 * @property string $neighborhood
 * @property string $marital_status
 * @property TeacherStatus $status
 * @property string|null $photo_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * @implements HasDossierFiles<$this>
 */
#[Fillable([
    'id',
    'code',
    'first_name',
    'last_name',
    'phone',
    'gender',
    'qualification',
    'hired_on',
    'born_on',
    'email',
    'address',
    'position',
    'city',
    'neighborhood',
    'marital_status',
    'status',
    'photo_url',
])]
class Teacher extends Model implements HasDossierFiles
{
    /** @use HasFactory<TeacherFactory> */
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
            'status' => TeacherStatus::class,
            'hired_on' => 'date',
            'born_on' => 'date',
        ];
    }

    /**
     * @return HasMany<TeacherAssignment, $this>
     */
    public function assignments(): HasMany
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
     *     firstName: string,
     *     lastName: string,
     *     phone: string,
     *     gender: string,
     *     qualification: string,
     *     hiredOn: string,
     *     bornOn: string|null,
     *     email: string|null,
     *     address: string|null,
     *     position: string|null,
     *     city: string,
     *     neighborhood: string,
     *     maritalStatus: string,
     *     status: string,
     *     photoUrl: string|null,
     *     files?: list<array{id: string, name: string, url: string, mime: string}>
     * }
     */
    public function toApiArray(): array
    {
        $payload = [
            'id' => $this->id,
            'code' => $this->code,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'phone' => $this->phone,
            'gender' => $this->gender->value,
            'qualification' => $this->qualification,
            'hiredOn' => $this->hired_on->format('Y-m-d'),
            'bornOn' => $this->born_on?->format('Y-m-d'),
            'email' => $this->email,
            'address' => $this->address,
            'position' => $this->position,
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'maritalStatus' => $this->marital_status,
            'status' => $this->status->value,
            'photoUrl' => $this->photo_url,
        ];

        if ($this->relationLoaded('files')) {
            $payload['files'] = array_values(
                $this->files->map->toApiArray()->all(),
            );
        }

        return $payload;
    }
}
