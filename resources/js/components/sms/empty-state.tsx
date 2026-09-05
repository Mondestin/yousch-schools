import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
    icon: Icon = Inbox,
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
                'flex flex-col items-center justify-center gap-2 px-6 py-16 text-center',
                className,
            )}
        >
            <Icon className="text-muted-foreground mb-1 size-5" />
            <p className="text-[13px] font-medium">{title}</p>
            {description && (
                <p className="text-muted-foreground max-w-sm text-[13px]">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
