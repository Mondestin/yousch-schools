import type {
    SubscriptionMethod,
    SubscriptionPlan,
    SubscriptionStatus,
} from '@/types/school';

export type PlanOffer = {
    plan: SubscriptionPlan;
    label: string;
    monthlyAmount: number;
    seats: number;
    /** Cycles couverts par la formule. */
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
        cycles: 'Primaire',
        summary: 'Pour un établissement du primaire.',
    },
    {
        plan: 'platinium',
        label: 'Platinium',
        monthlyAmount: 50000,
        seats: 25,
        cycles: 'Primaire et collège',
        summary: 'Pour le primaire et le collège.',
    },
    {
        plan: 'titanium',
        label: 'Titanium',
        monthlyAmount: 75000,
        seats: 60,
        cycles: 'Primaire, collège et lycée',
        summary: 'Pour les trois cycles de votre école.',
    },
];

export function planOffer(plan: SubscriptionPlan): PlanOffer {
    return PLAN_OFFERS.find((offer) => offer.plan === plan) ?? PLAN_OFFERS[0]!;
}

export function planLabel(plan: SubscriptionPlan): string {
    return planOffer(plan).label;
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
