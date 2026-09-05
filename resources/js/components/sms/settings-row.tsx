import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SettingsRow({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 border-b py-6 last:border-b-0 sm:flex-row sm:items-start sm:justify-between',
                className,
            )}
        >
            <div className="max-w-sm space-y-1">
                <h2 className="text-[13px] font-semibold">{title}</h2>
                {description && (
                    <p className="text-muted-foreground text-[13px]">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
                {children}
            </div>
        </div>
    );
}
