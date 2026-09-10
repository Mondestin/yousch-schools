import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ChartCard({
    title,
    description,
    action,
    height = 240,
    loading = false,
    legend,
    summary,
    className,
    children,
    custom = false,
}: {
    title: string;
    description?: string;
    /** @deprecated Kept for call-site compatibility; not rendered. */
    icon?: LucideIcon;
    action?: ReactNode;
    height?: number;
    loading?: boolean;
    legend?: ReactNode;
    summary?: string;
    className?: string;
    /** When true, children are rendered as-is (not wrapped in Recharts ResponsiveContainer). */
    custom?: boolean;
    children: ReactNode;
}) {
    return (
        <section
            className={cn(
                'border-border/80 bg-card shrink-0 overflow-hidden rounded-lg border shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div className="min-w-0">
                    <h2 className="text-foreground text-[15px] font-semibold tracking-tight">
                        {title}
                    </h2>
                    {description ? (
                        <p className="text-muted-foreground mt-0.5 text-[12px] leading-4">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>

            <div
                className="px-3 pt-2 pb-3"
                role={custom ? undefined : 'img'}
                aria-label={
                    custom
                        ? undefined
                        : (summary ??
                          [title, description].filter(Boolean).join('. '))
                }
            >
                {loading ? (
                    <Skeleton
                        className="mx-2 rounded-lg"
                        style={{ height }}
                    />
                ) : custom ? (
                    children
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        {children as React.ReactElement}
                    </ResponsiveContainer>
                )}
            </div>

            {legend ? (
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t px-5 py-3 text-[12px]">
                    {legend}
                </div>
            ) : null}
        </section>
    );
}

export function ChartLegendItem({
    color,
    children,
}: {
    color: string;
    children: ReactNode;
}) {
    return (
        <span className="flex items-center gap-1.5">
            <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: color }}
            />
            {children}
        </span>
    );
}

/** Tooltip body shared by every chart so they read the same. */
export function ChartTooltipContent({
    active,
    payload,
    label,
    formatter,
}: {
    active?: boolean;
    payload?: { name?: string; value?: number | string; color?: string }[];
    label?: string | number;
    formatter?: (value: number) => string;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="bg-popover text-popover-foreground rounded-xl border px-3 py-2 text-[12px] shadow-md">
            {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
            <ul className="space-y-0.5">
                {payload.map((entry, index) => (
                    <li
                        key={`${entry.name}-${index}`}
                        className="flex items-center gap-2"
                    >
                        <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                            {entry.name}
                        </span>
                        <span className="ml-auto font-medium tabular-nums">
                            {typeof entry.value === 'number' && formatter
                                ? formatter(entry.value)
                                : entry.value}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export const CHART_AXIS = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;
