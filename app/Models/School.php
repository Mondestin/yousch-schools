<?php

namespace App\Models;

use Database\Factories\SchoolFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property string $domain
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'domain', 'status'])]
class School extends Model
{
    /** @use HasFactory<SchoolFactory> */
    use HasFactory, HasUlids;

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * @return HasOne<SchoolProfile, $this>
     */
    public function profile(): HasOne
    {
        return $this->hasOne(SchoolProfile::class);
    }

    /**
     * @return HasOne<SchoolSubscription, $this>
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(SchoolSubscription::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return array{id: string, name: string, domain: string, status: string}
     */
    public function toSharedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'domain' => $this->domain,
            'status' => $this->status,
        ];
    }
}
