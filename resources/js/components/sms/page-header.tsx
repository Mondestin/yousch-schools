import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
    title,
    description,
    icon: Icon,
    actions,
    className,
    flush = false,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: ReactNode;
    className?: string;
    /** Sits inside an edge-to-edge shell, so it supplies its own padding. */
    flush?: boolean;
}) {
    if (flush) {
        return (
            <header
                className={cn(
                    'flex shrink-0 flex-col gap-3 px-6 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between',
                    className,
                )}
            >
                <div className="min-w-0">
                    <h1 className="text-foreground text-[20px] font-semibold tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-muted-foreground mt-1 max-w-3xl text-[13px] leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex shrink-0 items-center gap-2">
                        {actions}
                    </div>
                )}
            </header>
        );
    }

    return (
        <header
            className={cn(
                'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                {Icon && (
                    <Icon className="text-primary mt-0.5 size-6 shrink-0" />
                )}
                <div className="space-y-1">
                    <h1 className="text-[22px] font-semibold tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-muted-foreground max-w-2xl text-[13px]">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex shrink-0 items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    );
}
