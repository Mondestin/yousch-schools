import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ChartCard({
    title,
    description,
    icon: Icon,
    action,
    height = 240,
    loading = false,
    legend,
    summary,
    className,
    children,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: ReactNode;
    height?: number;
    loading?: boolean;
    legend?: ReactNode;
    summary?: string;
    className?: string;
    /** A single recharts chart element. */
    children: ReactNode;
}) {
    return (
        <section
            className={cn(
                'shrink-0 overflow-hidden rounded-[8px] border',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                    <h2 className="flex items-center gap-2 text-[13px] font-semibold">
                        {Icon && <Icon className="text-primary size-4" />}
                        {title}
                    </h2>
                    {description && (
                        <p className="text-muted-foreground mt-0.5 text-[12px]">
                            {description}
                        </p>
                    )}
                </div>
                {action}
            </div>
            <div
                className="px-2 pt-4 pb-2"
                role="img"
                aria-label={
                    summary ?? [title, description].filter(Boolean).join('. ')
                }
            >
                {loading ? (
                    <Skeleton
                        className="mx-2 rounded-[8px]"
                        style={{ height }}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height={height}>
                        {children as React.ReactElement}
                    </ResponsiveContainer>
                )}
            </div>
            {legend && (
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-[12px]">
                    {legend}
                </div>
            )}
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
                className="size-2 rounded-[2px]"
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
        <div className="bg-popover text-popover-foreground rounded-[8px] border px-3 py-2 text-[12px] shadow-md">
            {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
            <ul className="space-y-0.5">
                {payload.map((entry, index) => (
                    <li
                        key={`${entry.name}-${index}`}
                        className="flex items-center gap-2"
                    >
                        <span
                            aria-hidden
                            className="size-2 rounded-[2px]"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                            {entry.name}
                        </span>
                        <span className="ml-auto font-medium">
                            {formatter && typeof entry.value === 'number'
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
    stroke: 'var(--muted-foreground)',
    fontSize: 11,
} as const;
