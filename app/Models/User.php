<?php

namespace App\Models;

use App\Auth\HasApiTokens;
use App\Enums\Cycle;
use App\Enums\StaffRole;
use App\Support\Auth\StaffAccess;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property StaffRole $role
 * @property list<string>|null $cycles
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'phone', 'role', 'cycles', 'last_seen_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'role' => StaffRole::class,
            'cycles' => 'array',
            'last_seen_at' => 'datetime',
        ];
    }

    public function canAccess(string $ability): bool
    {
        return StaffAccess::can($this->role, $ability);
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     email: string,
     *     phone: string,
     *     role: string,
     *     cycles: list<string>,
     *     lastSeenAt: string|null,
     *     abilities: list<string>
     * }
     */
    public function toStaffApiArray(): array
    {
        $cycles = $this->cycles ?? [];

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone ?? '',
            'role' => $this->role->value,
            'cycles' => array_values($cycles),
            'lastSeenAt' => $this->last_seen_at?->toIso8601String(),
            'abilities' => StaffAccess::abilitiesFor($this->role),
        ];
    }

    /**
     * @return list<Cycle>
     */
    public function cycleEnums(): array
    {
        return array_values(array_filter(array_map(
            static fn (string $value): ?Cycle => Cycle::tryFrom($value),
            $this->cycles ?? [],
        )));
    }
}
