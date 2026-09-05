import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';

export type PageTabItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon;
};

export function PageTabs({
    items,
    match = 'prefix',
    flush = false,
}: {
    items: PageTabItem[];
    match?: 'prefix' | 'exact';
    /** Spans the full width of an edge-to-edge shell. */
    flush?: boolean;
}) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <nav
            className={cn(
                'border-border flex shrink-0 overflow-x-auto border-b',
                flush && 'px-6',
            )}
            aria-label="Sections"
        >
            {items.map((item) => {
                const active =
                    match === 'exact'
                        ? isCurrentUrl(item.href)
                        : isCurrentOrParentUrl(item.href);
                const Icon = item.icon;

                return (
                    <Link
                        key={toUrl(item.href)}
                        href={item.href}
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors',
                            !flush && 'first:pl-0',
                            active
                                ? 'border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground border-transparent',
                        )}
                    >
                        {Icon && <Icon className="size-4" />}
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
