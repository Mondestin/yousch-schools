<?php

namespace App\Auth;

use App\Models\PersonalAccessToken;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

/**
 * Minimal Sanctum-compatible API token helpers for mobile clients.
 *
 * @mixin Model
 */
trait HasApiTokens
{
    protected ?PersonalAccessToken $currentAccessToken = null;

    /**
     * @return MorphMany<PersonalAccessToken, $this>
     */
    public function tokens(): MorphMany
    {
        return $this->morphMany(PersonalAccessToken::class, 'tokenable');
    }

    /**
     * @param  list<string>  $abilities
     * @return array{accessToken: PersonalAccessToken, plainTextToken: string}
     */
    public function createToken(string $name, array $abilities = ['*']): array
    {
        $plainTextToken = sprintf(
            '%s%s%s',
            $this->getKey(),
            '|',
            Str::random(40),
        );

        /** @var PersonalAccessToken $token */
        $token = $this->tokens()->create([
            'name' => $name,
            'token' => hash('sha256', $plainTextToken),
            'abilities' => $abilities,
        ]);

        return [
            'accessToken' => $token,
            'plainTextToken' => $plainTextToken,
        ];
    }

    public function currentAccessToken(): ?PersonalAccessToken
    {
        return $this->currentAccessToken;
    }

    public function withAccessToken(PersonalAccessToken $accessToken): static
    {
        $this->currentAccessToken = $accessToken;

        return $this;
    }

    public function tokenCan(string $ability): bool
    {
        return $this->currentAccessToken?->can($ability) ?? false;
    }
}
