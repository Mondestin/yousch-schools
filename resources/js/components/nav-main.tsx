import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

function hrefPath(href: NavItem['href']): string {
    try {
        return new URL(toUrl(href), 'http://localhost').pathname;
    } catch {
        return toUrl(href).split('?')[0] ?? '';
    }
}

function hrefRoot(href: NavItem['href']): string {
    const segment = hrefPath(href).split('/').filter(Boolean)[0];

    return segment ? `/${segment}` : '/';
}

export function NavMain({
    items,
    label = 'Établissement',
}: {
    items: NavItem[];
    label?: string;
}) {
    const { currentUrl, isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const root = hrefRoot(item.href);
                    const isActive =
                        item.isActive ??
                        (item.match === 'prefix'
                            ? currentUrl === root ||
                              currentUrl.startsWith(`${root}/`)
                            : isCurrentUrl(item.href));

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
