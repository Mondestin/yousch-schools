import { cashMethodLabel } from '@/lib/school-office';
import {
    MOBILE_MONEY_PROVIDERS,
    type MobileMoneyProvider,
} from '@/lib/school-mobile-money';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types/school';

function momoProvider(
    method: PaymentMethod,
): MobileMoneyProvider | null {
    if (method === 'mtn_money') {
        return 'mtn';
    }

    if (method === 'airtel_money') {
        return 'airtel';
    }

    return null;
}

/** Mode de règlement — one MoMo logo when MTN or Airtel was used. */
export function PaymentMethodCell({
    method,
    className,
}: {
    method: PaymentMethod | null | undefined;
    className?: string;
}) {
    if (!method) {
        return <span className={className}>-</span>;
    }

    const provider = momoProvider(method);

    if (provider) {
        const info = MOBILE_MONEY_PROVIDERS[provider];

        return (
            <span
                className={cn('inline-flex items-center gap-1.5', className)}
                title={info.label}
            >
                <img
                    src={info.logo}
                    alt={info.label}
                    className="h-7 w-12 rounded-[6px] bg-white object-contain ring-1 ring-black/5"
                />
                <span className="sr-only">{info.label}</span>
            </span>
        );
    }

    return (
        <span className={cn(className)}>
            {cashMethodLabel(method)}
        </span>
    );
}
