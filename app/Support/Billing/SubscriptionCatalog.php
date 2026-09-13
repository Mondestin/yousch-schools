<?php

namespace App\Support\Billing;

use App\Enums\Cycle;
use App\Enums\SubscriptionPlan;
use App\Models\SchoolSubscription;
use Illuminate\Validation\ValidationException;

final class SubscriptionCatalog
{
    /**
     * @return array{
     *     monthlyAmount: int,
     *     seats: int,
     *     label: string,
     *     cycles: list<string>,
     *     cyclesLabel: string,
     *     summary: string
     * }
     */
    public static function offer(SubscriptionPlan|string $plan): array
    {
        $value = $plan instanceof SubscriptionPlan ? $plan->value : $plan;
        $cycles = self::cyclesFor($value);

        return match ($value) {
            'platinium' => [
                'label' => 'Platinium',
                'monthlyAmount' => 50000,
                'seats' => 25,
                'cycles' => $cycles,
                'cyclesLabel' => 'Préscolaire, primaire et collège',
                'summary' => 'Pour le préscolaire, le primaire et le collège.',
            ],
            'titanium' => [
                'label' => 'Titanium',
                'monthlyAmount' => 75000,
                'seats' => 60,
                'cycles' => $cycles,
                'cyclesLabel' => 'Préscolaire, primaire, collège et lycée',
                'summary' => 'Pour tous les cycles, du préscolaire au lycée.',
            ],
            default => [
                'label' => 'Gold',
                'monthlyAmount' => 25000,
                'seats' => 10,
                'cycles' => $cycles,
                'cyclesLabel' => 'Préscolaire et primaire',
                'summary' => 'Pour le préscolaire et le primaire.',
            ],
        };
    }

    /**
     * Cycles inclus dans la formule (cumulatifs).
     *
     * @return list<string>
     */
    public static function cyclesFor(SubscriptionPlan|string $plan): array
    {
        $value = $plan instanceof SubscriptionPlan ? $plan->value : $plan;

        return match ($value) {
            'platinium' => [
                Cycle::Prescolaire->value,
                Cycle::Primaire->value,
                Cycle::College->value,
            ],
            'titanium' => [
                Cycle::Prescolaire->value,
                Cycle::Primaire->value,
                Cycle::College->value,
                Cycle::LyceeGeneral->value,
                Cycle::LyceeTechnique->value,
            ],
            default => [
                Cycle::Prescolaire->value,
                Cycle::Primaire->value,
            ],
        };
    }

    public static function allowsCycle(SubscriptionPlan|string $plan, Cycle|string $cycle): bool
    {
        $cycleValue = $cycle instanceof Cycle ? $cycle->value : $cycle;

        return in_array($cycleValue, self::cyclesFor($plan), true);
    }

    /**
     * Plan of the current tenant (Gold when none).
     */
    public static function currentPlan(): SubscriptionPlan
    {
        $subscription = SchoolSubscription::query()->first();

        return $subscription?->plan ?? SubscriptionPlan::Gold;
    }

    /**
     * @return list<string>
     */
    public static function currentCycles(): array
    {
        return self::cyclesFor(self::currentPlan());
    }

    public static function amountForPeriod(SubscriptionPlan|string $plan, string $period): int
    {
        $monthly = self::offer($plan)['monthlyAmount'];

        return $period === 'annual' ? $monthly * 10 : $monthly;
    }

    public static function seatsFor(SubscriptionPlan|string $plan): int
    {
        return self::offer($plan)['seats'];
    }

    /**
     * @param  list<string>|string  $cycles
     */
    public static function assertCyclesAllowed(
        SubscriptionPlan|string $plan,
        array|string $cycles,
        string $attribute = 'cycle',
    ): void {
        $values = is_array($cycles) ? $cycles : [$cycles];
        $allowed = self::cyclesFor($plan);
        $denied = array_values(array_filter(
            $values,
            static fn (string $cycle): bool => ! in_array($cycle, $allowed, true),
        ));

        if ($denied === []) {
            return;
        }

        $offer = self::offer($plan);

        throw ValidationException::withMessages([
            $attribute => [
                "La formule {$offer['label']} couvre seulement : {$offer['cyclesLabel']}. Passez à une formule supérieure pour ce niveau.",
            ],
        ]);
    }
}
