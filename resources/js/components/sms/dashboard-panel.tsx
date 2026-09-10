import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DashboardPanel({
    title,
    href,
    children,
    className,
}: {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    /** @deprecated Kept for call-site compatibility; not rendered. */
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'border-border/80 bg-card overflow-hidden rounded-lg border shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <h2 className="text-foreground text-[15px] font-semibold tracking-tight">
                    {title}
                </h2>
                <Link
                    href={href}
                    className="text-primary flex items-center gap-1 text-[13px] font-medium hover:underline"
                    prefetch
                >
                    Voir tout
                    <ArrowRight className="size-3.5" />
                </Link>
            </div>
            {children}
        </section>
    );
}
