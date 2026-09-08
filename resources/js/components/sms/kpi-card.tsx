import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function KpiCard({
    label,
    value,
    hint,
    icon: Icon,
    loading = false,
    children,
    className,
}: {
    label: string;
    value: string;
    hint?: string;
    icon?: LucideIcon;
    loading?: boolean;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            data-slot="kpi-card"
            className={cn(
                'bg-background border-border relative isolate h-full min-h-[88px] min-w-0 overflow-hidden border px-5 py-4',
                className,
            )}
        >
            {Icon && (
                <Icon
                    aria-hidden="true"
                    data-slot="kpi-icon"
                    strokeWidth={1.8}
                    className="text-primary pointer-events-none absolute top-2 -right-2 -z-10 size-20 opacity-[0.06] dark:opacity-[0.12]"
                />
            )}
            {loading ? (
                <Skeleton
                    aria-label="Chargement de la statistique"
                    className="h-7 w-24 rounded"
                />
            ) : (
                <p className="text-foreground text-[22px] leading-7 font-semibold tracking-tight break-words tabular-nums">
                    {value}
                </p>
            )}
            <p className="text-muted-foreground mt-1.5 text-[12px] leading-5">
                {label}
            </p>
            {hint && (
                <p className="text-muted-foreground mt-1 text-[12px]">{hint}</p>
            )}
            {children}
        </div>
    );
}

/** Connected statistic tiles with responsive rows and single-pixel dividers. */
export function KpiGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'bg-border border-border [&>a]:bg-background [&>button]:bg-background [&>a]:focus-visible:outline-primary [&>button]:focus-visible:outline-primary grid shrink-0 grid-cols-1 gap-px border sm:grid-cols-2 xl:grid-cols-4 [&_[data-slot=kpi-card]]:border-0 [&>*]:min-w-0 [&>:nth-child(even)_[data-slot=kpi-icon]]:text-orange-400 [&>a]:focus-visible:outline-2 [&>a]:focus-visible:-outline-offset-2 [&>button]:focus-visible:outline-2 [&>button]:focus-visible:-outline-offset-2',
                className,
            )}
        >
            {children}
        </div>
    );
}
