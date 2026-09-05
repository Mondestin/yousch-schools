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
        <div className={cn('rounded-[8px] border px-4 py-3', className)}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-muted-foreground text-[12px]">{label}</p>
                {Icon && <Icon className="text-primary size-4 shrink-0" />}
            </div>
            {loading ? (
                <Skeleton className="mt-2 h-7 w-24 rounded-[8px]" />
            ) : (
                <p className="mt-1 text-lg font-semibold tracking-tight">
                    {value}
                </p>
            )}
            {hint && (
                <p className="text-muted-foreground mt-1 text-[12px]">{hint}</p>
            )}
            {children}
        </div>
    );
}
