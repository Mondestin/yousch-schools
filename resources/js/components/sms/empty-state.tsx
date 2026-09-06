import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyStateIcon } from '@/components/sms/empty-state-icon';
import { cn } from '@/lib/utils';

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center',
                className,
            )}
        >
            <EmptyStateIcon icon={icon} />
            <p className="text-[14px] font-medium">{title}</p>
            {description && (
                <p className="text-muted-foreground max-w-md text-[14px]">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
