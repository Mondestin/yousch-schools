import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageShell({
    children,
    className,
    flush = false,
}: {
    children: ReactNode;
    className?: string;
    /** Edge-to-edge: the header, tab bar and table supply their own padding. */
    flush?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex min-h-0 flex-1 flex-col overflow-auto',
                flush ? 'gap-0' : 'gap-6 px-6 py-6',
                className,
            )}
        >
            {children}
        </div>
    );
}
