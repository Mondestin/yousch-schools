import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useSchoolContext } from '@/hooks/use-school-context';
import {
    announcementAudienceLabel,
    isAnnouncementExpired,
} from '@/lib/school-office';
import { formatFrDate, todayIso } from '@/lib/school-rows';
import { cn } from '@/lib/utils';
import { index as announcementsRoute } from '@/routes/announcements';
import type { Auth } from '@/types';
import type { Announcement, SchoolDataset } from '@/types/school';

const MAX_ITEMS = 8;
const STORAGE_PREFIX = 'yousch:notifications:cleared:v3:';

type ClearedStore = {
    subscribe: (onStoreChange: () => void) => () => void;
    getSnapshot: (userId: string) => string;
    getServerSnapshot: () => string;
    clear: (userId: string, fingerprint: string) => void;
};

function createClearedStore(): ClearedStore {
    const listeners = new Set<() => void>();

    function emit(): void {
        for (const listener of listeners) {
            listener();
        }
    }

    function key(userId: string): string {
        return `${STORAGE_PREFIX}${userId}`;
    }

    return {
        subscribe(onStoreChange) {
            listeners.add(onStoreChange);

            function onStorage(event: StorageEvent): void {
                if (event.key?.startsWith(STORAGE_PREFIX)) {
                    onStoreChange();
                }
            }

            if (typeof window !== 'undefined') {
                window.addEventListener('storage', onStorage);
            }

            return () => {
                listeners.delete(onStoreChange);

                if (typeof window !== 'undefined') {
                    window.removeEventListener('storage', onStorage);
                }
            };
        },
        getSnapshot(userId) {
            if (typeof window === 'undefined') {
                return '';
            }

            try {
                return window.localStorage.getItem(key(userId)) ?? '';
            } catch {
                return '';
            }
        },
        getServerSnapshot() {
            return '';
        },
        clear(userId, fingerprint) {
            if (typeof window === 'undefined' || fingerprint === '') {
                return;
            }

            try {
                window.localStorage.setItem(key(userId), fingerprint);
            } catch {
                // ignore
            }

            emit();
        },
    };
}

const clearedStore = createClearedStore();

function staffNotifications(announcements: Announcement[]): Announcement[] {
    const today = todayIso();

    return [...announcements]
        .filter(
            (item) =>
                (item.audience === 'tous' || item.audience === 'personnel') &&
                !isAnnouncementExpired(item, today) &&
                item.publishedOn <= today,
        )
        .sort((left, right) =>
            right.publishedOn.localeCompare(left.publishedOn),
        );
}

function fingerprintFor(items: Announcement[]): string {
    return items
        .map((item) => String(item.id))
        .filter(Boolean)
        .sort()
        .join('|');
}

export function NotificationBell() {
    'use no memo';

    const { catalog, auth } = usePage<{
        catalog: SchoolDataset | null;
        auth: Auth;
    }>().props;
    const { query } = useSchoolContext();
    const userId = auth.user?.id != null ? String(auth.user.id) : 'guest';
    const [open, setOpen] = useState(false);
    const userIdRef = useRef(userId);
    userIdRef.current = userId;

    const clearedFingerprint = useSyncExternalStore(
        clearedStore.subscribe,
        () => clearedStore.getSnapshot(userId),
        clearedStore.getServerSnapshot,
    );

    const items = staffNotifications(catalog?.announcements ?? []).slice(
        0,
        MAX_ITEMS,
    );
    const itemsRef = useRef(items);
    itemsRef.current = items;

    const fingerprint = fingerprintFor(items);
    const unreadCount =
        fingerprint !== '' && fingerprint !== clearedFingerprint
            ? items.length
            : 0;

    function clearVisible(): void {
        const next = fingerprintFor(itemsRef.current);
        clearedStore.clear(userIdRef.current, next);
    }

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                if (nextOpen) {
                    clearVisible();
                }

                setOpen(nextOpen);
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                        unreadCount > 0
                            ? `Notifications (${unreadCount} non lue${unreadCount === 1 ? '' : 's'})`
                            : 'Notifications'
                    }
                    className="relative size-9 shrink-0"
                >
                    <Bell className="size-4 opacity-80" />
                    {unreadCount > 0 ? (
                        <span className="bg-brand-secondary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white tabular-nums">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    ) : null}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[min(22rem,calc(100vw-1.5rem))] p-0"
            >
                <div className="flex items-center justify-between gap-3 border-b px-3.5 py-2.5">
                    <div>
                        <p className="text-[13px] font-semibold">
                            Notifications
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                            Annonces pour le personnel
                        </p>
                    </div>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            className="text-primary text-[11px] font-medium hover:underline"
                            onClick={clearVisible}
                        >
                            Tout marquer lu
                        </button>
                    ) : null}
                </div>

                {items.length === 0 ? (
                    <div className="text-muted-foreground px-3.5 py-8 text-center text-[12px]">
                        Aucune notification pour le moment.
                    </div>
                ) : (
                    <ul className="max-h-[22rem] overflow-y-auto py-1">
                        {items.map((item) => {
                            const unread = unreadCount > 0;

                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className={cn(
                                            'hover:bg-muted/50 flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-left transition-colors',
                                            unread && 'bg-primary/[0.04]',
                                        )}
                                        onClick={clearVisible}
                                    >
                                        <span className="flex items-start gap-2">
                                            {unread ? (
                                                <span
                                                    aria-hidden
                                                    className="bg-brand-secondary mt-1.5 size-1.5 shrink-0 rounded-full"
                                                />
                                            ) : (
                                                <span
                                                    aria-hidden
                                                    className="mt-1.5 size-1.5 shrink-0"
                                                />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="text-foreground line-clamp-1 text-[13px] font-medium">
                                                    {item.title}
                                                </span>
                                                <span className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px] leading-4">
                                                    {item.body}
                                                </span>
                                                <span className="text-muted-foreground mt-1 block text-[11px]">
                                                    {formatFrDate(
                                                        item.publishedOn,
                                                    )}{' '}
                                                    ·{' '}
                                                    {announcementAudienceLabel(
                                                        item.audience,
                                                    )}
                                                </span>
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="border-t px-3.5 py-2">
                    <Link
                        href={announcementsRoute({ query })}
                        className="text-primary block text-center text-[12px] font-medium hover:underline"
                        onClick={() => {
                            clearVisible();
                            setOpen(false);
                        }}
                    >
                        Voir les annonces
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
