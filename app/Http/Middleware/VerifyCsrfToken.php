<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken as Middleware;
use Illuminate\Http\Request;

/**
 * Session/CSRF for same-origin web; Bearer mobile clients skip CSRF.
 */
class VerifyCsrfToken extends Middleware
{
    /**
     * Login has no Bearer yet. Mobile clients also have no session cookie.
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/v1/login',
        'api/v1/login/*',
    ];

    /**
     * @param  Request  $request
     */
    protected function inExceptArray($request): bool
    {
        $bearer = $request->bearerToken();

        if (is_string($bearer) && $bearer !== '') {
            return true;
        }

        if ($request->is('api/*') && ! $request->cookies->has((string) config('session.cookie'))) {
            return true;
        }

        return parent::inExceptArray($request);
    }
}
