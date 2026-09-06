<?php

namespace App\Http\Middleware;

use App\Models\School;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetCurrentSchool
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        CurrentSchool::clear();

        $schoolId = $this->schoolIdFromSession($request)
            ?? $this->schoolIdFromSessionUser($request)
            ?? $this->schoolIdFromRequestUser($request);

        if (is_string($schoolId) && $schoolId !== '') {
            /** @var School|null $school */
            $school = School::query()->find($schoolId);

            if ($school !== null && $school->isActive()) {
                CurrentSchool::set($school);
            }
        }

        return $next($request);
    }

    private function schoolIdFromSession(Request $request): ?string
    {
        if (! $request->hasSession()) {
            return null;
        }

        $pending = $request->session()->get('login.school_id');

        return is_string($pending) && $pending !== '' ? $pending : null;
    }

    private function schoolIdFromSessionUser(Request $request): ?string
    {
        if (! $request->hasSession()) {
            return null;
        }

        $authId = $request->session()->get(Auth::guard('web')->getName());

        if ($authId === null || $authId === '') {
            return null;
        }

        /** @var User|null $user */
        $user = User::query()->whereKey($authId)->first();

        return $this->schoolId($user?->school_id);
    }

    private function schoolIdFromRequestUser(Request $request): ?string
    {
        return $this->schoolId($request->user()?->school_id);
    }

    private function schoolId(mixed $schoolId): ?string
    {
        return is_string($schoolId) && $schoolId !== '' ? $schoolId : null;
    }
}
