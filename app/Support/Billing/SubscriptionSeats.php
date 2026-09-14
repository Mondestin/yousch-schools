<?php

namespace App\Support\Billing;

use App\Enums\StaffRole;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Validation\ValidationException;

final class SubscriptionSeats
{
    public static function syncUsedSeats(?SchoolSubscription $subscription = null): void
    {
        $subscription ??= SchoolSubscription::query()->first();

        if ($subscription === null) {
            return;
        }

        $schoolId = $subscription->school_id ?? CurrentSchool::id();
        $used = User::query()
            ->when($schoolId !== null, fn ($query) => $query->where('school_id', $schoolId))
            ->whereIn('role', StaffRole::staffValues())
            ->count();

        $subscription->forceFill(['used_seats' => $used])->save();
    }

    public static function ensureAvailableSeat(?SchoolSubscription $subscription = null): void
    {
        $subscription ??= SchoolSubscription::query()->first();

        if ($subscription === null) {
            return;
        }

        self::syncUsedSeats($subscription);
        $subscription->refresh();

        if ($subscription->used_seats >= $subscription->seats) {
            throw ValidationException::withMessages([
                'email' => sprintf(
                    'Limite de sièges atteinte (%d / %d). Passez à une formule supérieure ou libérez un compte.',
                    $subscription->used_seats,
                    $subscription->seats,
                ),
            ]);
        }
    }
}
