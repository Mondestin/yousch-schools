<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property string $promoter_name
 * @property string $director_name
 * @property string $city
 * @property string $country
 * @property string $phone
 * @property string $email
 * @property string $address
 * @property string $motto
 * @property string $currency
 * @property string|null $logo_url
 * @property string|null $stamp_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'promoter_name',
    'director_name',
    'city',
    'country',
    'phone',
    'email',
    'address',
    'motto',
    'currency',
    'logo_url',
    'stamp_url',
])]
class SchoolProfile extends Model
{
    use HasUlids;

    /**
     * @return array{
     *     name: string,
     *     promoterName: string,
     *     directorName: string,
     *     city: string,
     *     country: string,
     *     phone: string,
     *     email: string,
     *     address: string,
     *     motto: string,
     *     currency: string,
     *     logoUrl: string|null,
     *     stampUrl: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'name' => $this->name,
            'promoterName' => $this->promoter_name,
            'directorName' => $this->director_name,
            'city' => $this->city,
            'country' => $this->country,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'motto' => $this->motto,
            'currency' => $this->currency,
            'logoUrl' => $this->logo_url,
            'stampUrl' => $this->stamp_url,
        ];
    }
}
