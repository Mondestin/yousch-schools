export const MOBILE_MONEY_PROVIDERS = {
    airtel: {
        label: 'Airtel Money',
        logo: '/images/airtel-money.png',
        /** YouSch collection number — schools send money here. */
        payToPhone: '+242065211234',
    },
    mtn: {
        label: 'MTN Mobile Money',
        logo: '/images/MTN_lmobile_money.jpg',
        /** YouSch collection number — schools send money here. */
        payToPhone: '+242055512345',
    },
} as const;

export type MobileMoneyProvider = keyof typeof MOBILE_MONEY_PROVIDERS;
export type MobileMoneyAccount = {
    provider: MobileMoneyProvider;
    phone: string;
};

/** Accept international numbers with common display separators; retain the country code. */
export function normalizeMobileMoneyPhone(value: string): string | null {
    const phone = value.trim().replace(/[\s()-]/g, '');

    return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

/** Display-friendly Mobile Money number (keeps +country). */
export function formatMobileMoneyPhone(value: string): string {
    const normalized = normalizeMobileMoneyPhone(value) ?? value.trim();

    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
        return value;
    }

    const country = normalized.slice(0, 4);
    const rest = normalized.slice(4);

    return `${country} ${rest.replace(/(\d{2})(?=\d)/g, '$1 ').trim()}`;
}
