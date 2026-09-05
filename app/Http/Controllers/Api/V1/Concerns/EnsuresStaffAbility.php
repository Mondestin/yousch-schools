<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\User;
use Illuminate\Http\JsonResponse;

trait EnsuresStaffAbility
{
    protected function denyUnlessCan(User $user, string $ability): ?JsonResponse
    {
        if ($user->canAccess($ability)) {
            return null;
        }

        return response()->json(['message' => 'Accès refusé.'], 403);
    }
}
