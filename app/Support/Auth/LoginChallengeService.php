<?php

namespace App\Support\Auth;

use App\Models\LoginChallenge;
use App\Models\School;
use App\Models\User;
use App\Notifications\LoginCodeNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class LoginChallengeService
{
    public const EXPIRES_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    /**
     * @return array{challenge: LoginChallenge, plainToken: string, code: string}
     */
    public function issue(User $user, School $school, ?string $deviceName = null): array
    {
        LoginChallenge::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update(['consumed_at' => now()]);

        $plainToken = (string) Str::ulid();
        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        $challenge = LoginChallenge::query()->create([
            'id' => (string) Str::ulid(),
            'user_id' => $user->id,
            'school_id' => $school->id,
            'token_hash' => hash('sha256', $plainToken),
            'code_hash' => Hash::make($code),
            'device_name' => $deviceName,
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::EXPIRES_MINUTES),
        ]);

        $user->notify(new LoginCodeNotification(
            code: $code,
            schoolName: $school->name,
            expiresInMinutes: self::EXPIRES_MINUTES,
        ));

        return [
            'challenge' => $challenge,
            'plainToken' => $plainToken,
            'code' => $code,
        ];
    }

    public function findValidChallenge(string $plainToken): LoginChallenge
    {
        /** @var LoginChallenge|null $challenge */
        $challenge = LoginChallenge::query()
            ->with(['user', 'school'])
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if ($challenge === null || $challenge->isConsumed() || $challenge->isExpired()) {
            throw ValidationException::withMessages([
                'challengeToken' => ['Ce code a expiré. Reconnectez-vous.'],
            ]);
        }

        if ($challenge->attempts >= self::MAX_ATTEMPTS) {
            $challenge->forceFill(['consumed_at' => now()])->save();

            throw ValidationException::withMessages([
                'code' => ['Trop de tentatives. Reconnectez-vous pour recevoir un nouveau code.'],
            ]);
        }

        return $challenge;
    }

    public function verify(LoginChallenge $challenge, string $code): User
    {
        $challenge->increment('attempts');
        $challenge->refresh();

        if (! Hash::check($code, $challenge->code_hash)) {
            if ($challenge->attempts >= self::MAX_ATTEMPTS) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                throw ValidationException::withMessages([
                    'code' => ['Trop de tentatives. Reconnectez-vous pour recevoir un nouveau code.'],
                ]);
            }

            throw ValidationException::withMessages([
                'code' => ['Code incorrect.'],
            ]);
        }

        $challenge->forceFill(['consumed_at' => now()])->save();

        /** @var User $user */
        $user = $challenge->user;

        return $user;
    }

    /**
     * @return array{challenge: LoginChallenge, plainToken: string, code: string}
     */
    public function resend(string $plainToken): array
    {
        $challenge = $this->findValidChallenge($plainToken);

        /** @var User $user */
        $user = $challenge->user;
        /** @var School $school */
        $school = $challenge->school;

        $challenge->forceFill(['consumed_at' => now()])->save();

        return $this->issue($user, $school, $challenge->device_name);
    }
}
