<?php

namespace App\Models;

use App\Enums\Gender;
use Database\Factories\GuardianFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $first_name
 * @property string $last_name
 * @property string $phone
 * @property string $profession
 * @property Gender|null $gender
 * @property string|null $email
 * @property string|null $city
 * @property string|null $neighborhood
 * @property string|null $address
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'first_name',
    'last_name',
    'phone',
    'profession',
    'gender',
    'email',
    'city',
    'neighborhood',
    'address',
])]
class Guardian extends Model
{
    /** @use HasFactory<GuardianFactory> */
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
        ];
    }

    /**
     * @return BelongsToMany<Student, $this>
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_guardian')
            ->withPivot('relation')
            ->withTimestamps();
    }

    /**
     * @return array{
     *     id: string,
     *     firstName: string,
     *     lastName: string,
     *     phone: string,
     *     profession: string,
     *     gender: string|null,
     *     email: string|null,
     *     city: string|null,
     *     neighborhood: string|null,
     *     address: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'phone' => $this->phone,
            'profession' => $this->profession,
            'gender' => $this->gender?->value,
            'email' => $this->email,
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'address' => $this->address,
        ];
    }
}
