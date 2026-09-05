<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\SchoolCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccess('subscription')) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $subscription = SchoolSubscription::query()
            ->with('receipts')
            ->first();

        if ($subscription !== null) {
            return response()->json(['data' => $subscription->toApiArray()]);
        }

        return response()->json([
            'data' => SchoolCatalog::fixture()['subscription'],
        ]);
    }
}
