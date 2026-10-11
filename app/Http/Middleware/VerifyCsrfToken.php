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
     * @param  Request  $request
     */
    protected function inExceptArray($request): bool
    {
        $bearer = $request->bearerToken();

        if (is_string($bearer) && $bearer !== '') {
            return true;
        }

        return parent::inExceptArray($request);
    }
}
