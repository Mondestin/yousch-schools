export const MOBILE_MONEY_PROVIDERS = {
    airtel: { label: 'Airtel Money', logo: '/images/airtel-money.png' },
    mtn: { label: 'MTN Mobile Money', logo: '/images/MTN_lmobile_money.jpg' },
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
