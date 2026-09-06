import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Design grid from the Notes illustration (215×140). */
function EmptyIconGrid({ className }: { className?: string }) {
    return (
        <svg
            width="215"
            height="140"
            viewBox="0 0 215 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
                'pointer-events-none absolute inset-0 size-full text-[#EEEFF1]',
                className,
            )}
            aria-hidden
        >
            {/* Dashed guides */}
            <path
                d="M64 0L64 140"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M151 0L151 140"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M215 33H0"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M215 108H0"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M215 78H0"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            {/* Solid outer frame */}
            <path
                d="M199 0L199 140"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
            <path
                d="M16 0L16 140"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
            <path
                d="M0 16L215 16"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
            <path
                d="M0 124L215 124"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
        </svg>
    );
}

const TONE_STYLES = {
    muted: {
        grid: undefined,
        icon: 'text-[#5C5E63]',
    },
    primary: {
        grid: 'text-primary/25',
        icon: 'text-primary',
    },
    inverse: {
        grid: 'text-white/35',
        icon: 'text-white',
    },
} as const;

/** Per-table Lucide icon centered in the Notes-style grid frame. */
export function EmptyStateIcon({
    icon: Icon = Inbox,
    className,
    iconClassName,
    gridClassName,
    strokeWidth = 0.25,
    tone = 'muted',
}: {
    icon?: LucideIcon;
    className?: string;
    iconClassName?: string;
    gridClassName?: string;
    strokeWidth?: number;
    tone?: keyof typeof TONE_STYLES;
}) {
    const styles = TONE_STYLES[tone];

    return (
        <div
            className={cn(
                'relative aspect-[215/140] w-[215px] max-w-full shrink-0 opacity-75',
                className,
            )}
        >
            <EmptyIconGrid className={cn(styles.grid, gridClassName)} />
            <div className="absolute inset-0 flex items-center justify-center">
                <Icon
                    className={cn('size-24', styles.icon, iconClassName)}
                    strokeWidth={strokeWidth}
                />
            </div>
        </div>
    );
}
