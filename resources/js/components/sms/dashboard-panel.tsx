import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DashboardPanel({
    title,
    href,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn('overflow-hidden rounded-[8px] border', className)}
        >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold">
                    {Icon && <Icon className="text-primary size-4" />}
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
