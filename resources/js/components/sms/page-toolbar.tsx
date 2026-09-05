import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageToolbar({
    search,
    filters,
    actions,
    className,
}: {
    search?: ReactNode;
    filters?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'border-border flex shrink-0 flex-wrap items-center gap-2 border-b px-6 py-2.5 [&_[data-slot=button]]:h-8 [&_[data-slot=search-select-trigger]]:h-8 [&_[data-slot=select-trigger]]:h-8',
                className,
            )}
        >
            {search}
            {filters ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {filters}
                </div>
            ) : (
                <div className="min-w-0 flex-1" />
            )}
            {actions ? (
                <div className="ml-auto flex flex-wrap items-center gap-2.5">
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
