<?php

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticate API requests via session (web) or Bearer personal access token (mobile).
 */
class AuthenticateStaffApi
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $bearer = $request->bearerToken();

        if (is_string($bearer) && $bearer !== '') {
            return $this->authenticateWithBearer($request, $next, $bearer);
        }

        if (Auth::guard('web')->check()) {
            $this->touchLastSeen(Auth::guard('web')->user());

            return $next($request);
        }

        return response()->json(['message' => 'Non authentifié.'], 401);
    }

    /**
     * @param  Closure(Request): Response  $next
     */
    private function authenticateWithBearer(Request $request, Closure $next, string $bearer): Response
    {
        $hashed = hash('sha256', $bearer);

        /** @var PersonalAccessToken|null $token */
        $token = PersonalAccessToken::query()
            ->where('token', $hashed)
            ->first();

        if ($token === null || ($token->expires_at !== null && $token->expires_at->isPast())) {
            Auth::guard('web')->forgetUser();

            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $user = $token->tokenable;

        if (! $user instanceof User) {
            Auth::guard('web')->forgetUser();

            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $token->forceFill(['last_used_at' => now()])->save();
        $user->withAccessToken($token);
        Auth::guard('web')->setUser($user);
        $this->touchLastSeen($user);

        return $next($request);
    }

    private function touchLastSeen(?User $user): void
    {
        if ($user === null) {
            return;
        }

        $user->forceFill(['last_seen_at' => now()])->saveQuietly();
    }
}
