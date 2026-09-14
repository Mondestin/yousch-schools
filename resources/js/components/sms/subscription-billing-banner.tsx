import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BillingAlert = {
    level: 'warning' | 'danger';
    code: string;
    message: string;
};

export function SubscriptionBillingBanner({
    alert,
    className,
}: {
    alert?: BillingAlert | null;
    className?: string;
}) {
    if (!alert) {
        return null;
    }

    return (
        <div
            role="status"
            className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]',
                alert.level === 'danger'
                    ? 'border-danger/25 bg-danger-soft text-danger'
                    : 'border-warning/25 bg-warning-soft text-warning',
                className,
            )}
        >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 font-medium leading-snug">
                {alert.message}
            </p>
        </div>
    );
}
