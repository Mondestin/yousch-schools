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
                'pointer-events-none absolute inset-0 size-full',
                className,
            )}
            aria-hidden
        >
            {/* Dashed guides */}
            <path
                d="M64 0L64 140"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M151 0L151 140"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M215 33H0"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M215 108H0"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            <path
                d="M215 78H0"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
                strokeDasharray="3 3"
            />
            {/* Solid outer frame */}
            <path
                d="M199 0L199 140"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
            <path
                d="M16 0L16 140"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
            <path
                d="M0 16L215 16"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
            <path
                d="M0 124L215 124"
                stroke="#EEEFF1"
                strokeWidth="0.8"
                strokeMiterlimit="10"
            />
        </svg>
    );
}

/** Per-table Lucide icon centered in the Notes-style grid frame. */
export function EmptyStateIcon({
    icon: Icon = Inbox,
    className,
}: {
    icon?: LucideIcon;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative aspect-[215/140] w-[215px] max-w-full shrink-0 opacity-75',
                className,
            )}
        >
            <EmptyIconGrid />
            <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="size-24 text-[#5C5E63]" strokeWidth={0.25} />
            </div>
        </div>
    );
}
