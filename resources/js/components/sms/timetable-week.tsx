import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { TimetableEvent } from '@/components/sms/timetable-event';
import { assessmentTypeLabel } from '@/lib/school-students';
import {
    assessmentTimeRange,
    assessmentsOnPeriod,
    capitalizeFr,
    findSlot,
    periodLabel,
    schoolHoursForClassroom,
    slotDisplay,
    subjectTone,
    timeToMinutes,
    timetableDaySegments,
    timetablePeriodsForClassroom,
    weekdayFromDate,
    type TimetableDaySegment,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';
import type {
    Assessment,
    SchoolDataset,
    TimetablePeriod,
    TimetableSlot,
    Weekday,
} from '@/types/school';

/** Pixel height of one full 30-minute block — used to scale all segments. */
const HALF_HOUR_HEIGHT_PX = 56;
const PX_PER_MINUTE = HALF_HOUR_HEIGHT_PX / 30;

export function TimetableWeek({
    catalog,
    classroomId,
    slots,
    days,
    onSelectDay,
    onCreate,
    onOpenSlot,
    onOpenExam,
}: {
    catalog: SchoolDataset;
    classroomId: string;
    slots: TimetableSlot[];
    days: Date[];
    onSelectDay?: (day: Date) => void;
    onCreate: (weekday: Weekday, periodId: string) => void;
    onOpenSlot: (slot: TimetableSlot) => void;
    onOpenExam?: (exam: Assessment) => void;
}) {
    const today = new Date();
    const singleDay = days.length === 1;
    const periods = timetablePeriodsForClassroom(catalog, classroomId);
    const hours = schoolHoursForClassroom(catalog, classroomId);
    const segments = timetableDaySegments(periods, hours);

    return (
        <div
            className={cn(!singleDay && 'min-w-[760px]')}
            style={{
                display: 'grid',
                gridTemplateColumns: `4.75rem repeat(${days.length}, minmax(0, 1fr))`,
            }}
        >
            {singleDay ? null : (
                <>
                    <div className="border-border bg-background sticky top-0 z-10 border-b" />
                    {days.map((day) => {
                        const isToday = isSameDay(day, today);

                        return (
                            <button
                                type="button"
                                key={day.toISOString()}
                                className="border-border bg-background sticky top-0 z-10 flex flex-col items-center gap-0.5 border-b border-l py-2"
                                onClick={() => onSelectDay?.(day)}
                            >
                                <span className="text-muted-foreground text-xs font-medium">
                                    {capitalizeFr(
                                        format(day, 'EEE', { locale: fr }),
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'text-lg leading-none font-semibold',
                                        isToday && 'text-primary',
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                            </button>
                        );
                    })}
                </>
            )}

            {segments.map((segment) => (
                <SegmentRow
                    key={`${segment.kind}-${segment.startsAt}-${segment.endsAt}`}
                    catalog={catalog}
                    classroomId={classroomId}
                    slots={slots}
                    days={days}
                    segment={segment}
                    periods={periods}
                    today={singleDay ? null : today}
                    onCreate={onCreate}
                    onOpenSlot={onOpenSlot}
                    onOpenExam={onOpenExam}
                />
            ))}

            {hours.endsAt ? (
                <>
                    <div className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-1.5 pb-2 text-xs leading-none">
                        {hours.endsAt}
                    </div>
                    <div
                        className="border-border border-t"
                        style={{ gridColumn: `2 / span ${days.length}` }}
                    />
                </>
            ) : null}
        </div>
    );
}

function segmentHeight(segment: Pick<TimetableDaySegment, 'startsAt' | 'endsAt'>): number {
    const minutes = Math.max(
        1,
        timeToMinutes(segment.endsAt) - timeToMinutes(segment.startsAt),
    );

    return Math.max(28, minutes * PX_PER_MINUTE);
}

function AddBox({ height, onClick }: { height: number; onClick: () => void }) {
    return (
        <button
            type="button"
            className="text-muted-foreground/70 hover:border-primary hover:text-primary border-border group-hover:text-muted-foreground flex w-full items-center justify-center rounded-md border border-dashed transition"
            style={{ minHeight: Math.max(28, height - 8) }}
            onClick={onClick}
        >
            <Plus className="size-4" />
            <span className="sr-only">Ajouter un créneau</span>
        </button>
    );
}

function SegmentRow({
    catalog,
    classroomId,
    slots,
    days,
    segment,
    periods,
    today,
    onCreate,
    onOpenSlot,
    onOpenExam,
}: {
    catalog: SchoolDataset;
    classroomId: string;
    slots: TimetableSlot[];
    days: Date[];
    segment: TimetableDaySegment;
    periods: TimetablePeriod[];
    today: Date | null;
    onCreate: (weekday: Weekday, periodId: string) => void;
    onOpenSlot: (slot: TimetableSlot) => void;
    onOpenExam?: (exam: Assessment) => void;
}) {
    const height = segmentHeight(segment);

    return (
        <>
            <div
                className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-1.5 text-xs leading-none"
                style={{ height }}
            >
                {segment.startsAt}
            </div>
            {days.map((day) => {
                const weekday = weekdayFromDate(day);
                const isToday = today !== null && isSameDay(day, today);

                if (!weekday) {
                    return (
                        <div
                            key={day.toISOString()}
                            className="border-border border-t border-l"
                            style={{ height }}
                        />
                    );
                }

                if (segment.kind === 'break') {
                    return (
                        <div
                            key={`${day.toISOString()}-${segment.startsAt}-break`}
                            className="border-border bg-muted/40 text-muted-foreground flex items-center justify-center border-t border-l px-2 text-center text-[10px] font-medium tracking-[0.08em] uppercase"
                            style={{ height }}
                        >
                            {segment.label}
                        </div>
                    );
                }

                if (segment.kind === 'gap') {
                    return (
                        <div
                            key={`${day.toISOString()}-${segment.startsAt}-gap`}
                            className={cn(
                                'border-border border-t border-l',
                                isToday && 'bg-primary/[0.03]',
                            )}
                            style={{ height }}
                        />
                    );
                }

                const period = segment.period;
                const slot = findSlot(slots, classroomId, weekday, period.id);
                const exams = assessmentsOnPeriod(
                    catalog,
                    classroomId,
                    day,
                    period.id,
                );
                const display = slot ? slotDisplay(catalog, slot) : null;

                return (
                    <div
                        key={`${day.toISOString()}-${segment.startsAt}-period`}
                        className={cn(
                            'border-border group relative border-t border-l p-1',
                            isToday && 'bg-primary/[0.03]',
                        )}
                        style={{ height }}
                    >
                        <div className="flex h-full flex-col gap-1">
                            {slot && display ? (
                                <TimetableEvent
                                    block
                                    tone={subjectTone(catalog, slot.subjectId)}
                                    title={display.subjectName}
                                    time={periodLabel(slot.periodId, periods)}
                                    hint={
                                        display.room
                                            ? `${display.teacherLastName} · ${display.room}`
                                            : display.teacherLastName
                                    }
                                    onClick={() => onOpenSlot(slot)}
                                />
                            ) : exams.length === 0 ? (
                                <AddBox
                                    height={height}
                                    onClick={() => onCreate(weekday, period.id)}
                                />
                            ) : null}
                            {exams.map((exam) => (
                                <TimetableEvent
                                    key={exam.id}
                                    tone="exam"
                                    title={exam.name}
                                    time={`${assessmentTypeLabel(exam.type)} · ${assessmentTimeRange(exam)}`}
                                    onClick={
                                        onOpenExam
                                            ? () => onOpenExam(exam)
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
