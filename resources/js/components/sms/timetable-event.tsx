import type { SubjectTone } from '@/lib/school-timetable';
import { cn } from '@/lib/utils';

export type EventTone = SubjectTone | 'exam';

/** Written out in full because Tailwind only keeps class names it sees literally. */
const TONE_CLASSES: Record<EventTone, string> = {
    purple: 'border-event-purple-line bg-event-purple-soft text-event-purple hover:bg-event-purple-line/50',
    blue: 'border-event-blue-line bg-event-blue-soft text-event-blue hover:bg-event-blue-line/50',
    teal: 'border-event-teal-line bg-event-teal-soft text-event-teal hover:bg-event-teal-line/50',
    green: 'border-event-green-line bg-event-green-soft text-event-green hover:bg-event-green-line/50',
    amber: 'border-event-amber-line bg-event-amber-soft text-event-amber hover:bg-event-amber-line/50',
    rose: 'border-event-rose-line bg-event-rose-soft text-event-rose hover:bg-event-rose-line/50',
    exam: 'border-dashed border-warning/50 bg-warning-soft text-warning hover:bg-warning-soft/70',
};

export function TimetableEvent({
    title,
    time,
    hint,
    tone = 'purple',
    block = false,
    onClick,
}: {
    title: string;
    time: string;
    hint?: string;
    tone?: EventTone;
    block?: boolean;
    onClick?: () => void;
}) {
    if (!block) {
        return (
            <button
                type="button"
                className={cn(
                    'mx-1 flex h-[26px] w-[calc(100%-0.5rem)] items-center justify-between gap-1.5 truncate rounded-md border px-2 text-xs whitespace-nowrap transition-colors select-none',
                    TONE_CLASSES[tone],
                )}
                onClick={onClick}
            >
                <span className="flex-1 truncate text-left font-semibold">
                    {title}
                </span>
                <span className="shrink-0">{time}</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            className={cn(
                'flex h-full w-full flex-col justify-between gap-1 rounded-md border px-2 py-1.5 text-left text-xs transition-colors select-none',
                TONE_CLASSES[tone],
            )}
            onClick={onClick}
        >
            <span className="truncate font-semibold">{title}</span>
            <span className="truncate opacity-90">
                {time}
                {hint ? ` · ${hint}` : ''}
            </span>
        </button>
    );
}
