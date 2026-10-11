<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Support\Auth\LoginChallengeService;
use Illuminate\Auth\Events\Failed;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\LoginRateLimiter;

/**
 * After password validation, e-mail a 4-digit code instead of creating a session.
 */
class RedirectIfEmailLoginCodeRequired
{
    public function __construct(
        protected StatefulGuard $guard,
        protected LoginRateLimiter $limiter,
        protected LoginChallengeService $challenges,
    ) {}

    /**
     * @param  callable(Request): mixed  $next
     */
    public function handle(Request $request, callable $next): mixed
    {
        $user = $this->validateCredentials($request);

        /** @var User $user */
        $school = $user->school()->first();

        if ($school === null) {
            $this->throwFailedAuthenticationException($request);
        }

        $issued = $this->challenges->issue($user, $school, 'web');

        $request->session()->put([
            'login.challenge_token' => $issued['plainToken'],
            'login.remember' => $request->boolean('remember'),
        ]);

        $this->limiter->clear($request);

        return $request->wantsJson()
            ? response()->json([
                'requiresVerification' => true,
                'challengeToken' => $issued['plainToken'],
            ])
            : redirect()->route('login.code');
    }

    protected function validateCredentials(Request $request): User
    {
        if (Fortify::$authenticateUsingCallback) {
            $user = call_user_func(Fortify::$authenticateUsingCallback, $request);

            if (! $user instanceof User) {
                $this->fireFailedEvent($request);
                $this->throwFailedAuthenticationException($request);
            }

            return $user;
        }

        $this->throwFailedAuthenticationException($request);
    }

    /**
     * @return never
     */
    protected function throwFailedAuthenticationException(Request $request): void
    {
        $this->limiter->increment($request);

        throw ValidationException::withMessages([
            Fortify::username() => [trans('auth.failed')],
        ]);
    }

    protected function fireFailedEvent(Request $request): void
    {
        event(new Failed($this->guard->name ?? config('fortify.guard'), null, [
            Fortify::username() => $request->{Fortify::username()},
            'password' => $request->password,
        ]));
    }
}
