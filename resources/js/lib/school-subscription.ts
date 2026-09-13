import type {
    Cycle,
    SubscriptionMethod,
    SubscriptionPlan,
    SubscriptionStatus,
} from '@/types/school';

export type PlanOffer = {
    plan: SubscriptionPlan;
    label: string;
    monthlyAmount: number;
    seats: number;
    /** Cycle values covered by the plan. */
    cycleValues: Cycle[];
    /** Human-readable cycles line for pricing cards. */
    cycles: string;
    summary: string;
};

/** Ordered from the entry offer to the top one. */
export const PLAN_OFFERS: PlanOffer[] = [
    {
        plan: 'gold',
        label: 'Gold',
        monthlyAmount: 25000,
        seats: 10,
        cycleValues: ['prescolaire', 'primaire'],
        cycles: 'Préscolaire et primaire',
        summary: 'Pour le préscolaire et le primaire.',
    },
    {
        plan: 'platinium',
        label: 'Platinium',
        monthlyAmount: 50000,
        seats: 25,
        cycleValues: ['prescolaire', 'primaire', 'college'],
        cycles: 'Préscolaire, primaire et collège',
        summary: 'Pour le préscolaire, le primaire et le collège.',
    },
    {
        plan: 'titanium',
        label: 'Titanium',
        monthlyAmount: 75000,
        seats: 60,
        cycleValues: [
            'prescolaire',
            'primaire',
            'college',
            'lycee_general',
            'lycee_technique',
        ],
        cycles: 'Préscolaire, primaire, collège et lycée',
        summary: 'Pour tous les cycles, du préscolaire au lycée.',
    },
];

export function planOffer(plan: SubscriptionPlan): PlanOffer {
    return PLAN_OFFERS.find((offer) => offer.plan === plan) ?? PLAN_OFFERS[0]!;
}

export function planLabel(plan: SubscriptionPlan): string {
    return planOffer(plan).label;
}

export function planIncludesCycle(
    plan: SubscriptionPlan,
    cycle: Cycle,
): boolean {
    return planOffer(plan).cycleValues.includes(cycle);
}

export function subscriptionStatusLabel(status: SubscriptionStatus): string {
    if (status === 'active') {
        return 'Actif';
    }

    return status === 'past_due' ? 'Impayé' : 'Résilié';
}

export function subscriptionMethodLabel(method: SubscriptionMethod): string {
    if (method === 'mobile_money') {
        return 'Mobile money';
    }

    return method === 'virement' ? 'Virement bancaire' : 'Espèces';
}
