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
    className,
}: {
    label: string;
    value: string;
    hint?: string;
    icon?: LucideIcon;
    loading?: boolean;
    /** @deprecated Progress bars and extra content are no longer rendered. */
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            data-slot="kpi-card"
            className={cn(
                'border-border/80 bg-card relative isolate flex h-full min-h-[5.5rem] min-w-0 flex-col overflow-hidden rounded-lg border px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
                className,
            )}
        >
            {Icon ? (
                <Icon
                    aria-hidden="true"
                    data-slot="kpi-icon"
                    strokeWidth={1.6}
                    className="text-primary pointer-events-none absolute top-1/2 -right-2 -z-10 size-16 -translate-y-1/2 opacity-[0.1] dark:opacity-[0.16]"
                />
            ) : null}

            {hint ? (
                <p className="text-muted-foreground relative mb-2 max-w-[70%] self-end text-right text-[11px] leading-4">
                    {hint}
                </p>
            ) : (
                <span className="mb-2 block h-4" aria-hidden />
            )}

            <div className="relative mt-auto min-w-0">
                {loading ? (
                    <Skeleton
                        aria-label="Chargement de la statistique"
                        className="h-7 w-24 rounded"
                    />
                ) : (
                    <p className="text-foreground text-[1.4rem] leading-7 font-semibold tracking-tight break-words tabular-nums">
                        {value}
                    </p>
                )}
                <p className="text-muted-foreground mt-1 text-[12px] leading-4">
                    {label}
                </p>
            </div>
        </div>
    );
}

/** Spaced statistic cards. */
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
                'grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
                '[&>:nth-child(even)_[data-slot=kpi-icon]]:text-brand-secondary',
                '[&>a]:text-foreground [&>a]:no-underline [&>a]:hover:text-foreground',
                '[&>a]:focus-visible:outline-primary [&>button]:focus-visible:outline-primary [&>a]:focus-visible:outline-2 [&>a]:focus-visible:outline-offset-2 [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-offset-2',
                '[&>*]:min-w-0',
                className,
            )}
        >
            {children}
        </div>
    );
}
