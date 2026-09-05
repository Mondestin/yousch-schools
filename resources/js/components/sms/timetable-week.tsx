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
    segmentHeightPx,
    slotDisplay,
    subjectTone,
    timetableDaySegments,
    timetablePeriodsForClassroom,
    weekdayFromDate,
    type TimetableDaySegment,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';
import type {
    SchoolDataset,
    SchoolHours,
    TimetablePeriod,
    TimetableSlot,
    Weekday,
} from '@/types/school';

/** Visual height of ouverture → fermeture (px). Segments scale to this. */
const DAY_HEIGHT_PX = 640;

export function TimetableWeek({
    catalog,
    classroomId,
    slots,
    days,
    onSelectDay,
    onCreate,
    onEdit,
}: {
    catalog: SchoolDataset;
    classroomId: string;
    slots: TimetableSlot[];
    days: Date[];
    onSelectDay?: (day: Date) => void;
    onCreate: (weekday: Weekday, periodId: string) => void;
    onEdit: (slot: TimetableSlot) => void;
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

            {segments.map((segment, index) => (
                <DaySegmentRow
                    key={`${segment.kind}-${segment.startsAt}-${segment.endsAt}`}
                    catalog={catalog}
                    classroomId={classroomId}
                    slots={slots}
                    days={days}
                    segment={segment}
                    periods={periods}
                    hours={hours}
                    showEndLabel={index === segments.length - 1}
                    today={singleDay ? null : today}
                    onCreate={onCreate}
                    onEdit={onEdit}
                />
            ))}
        </div>
    );
}

function DaySegmentRow({
    catalog,
    classroomId,
    slots,
    days,
    segment,
    periods,
    hours,
    showEndLabel,
    today,
    onCreate,
    onEdit,
}: {
    catalog: SchoolDataset;
    classroomId: string;
    slots: TimetableSlot[];
    days: Date[];
    segment: TimetableDaySegment;
    periods: TimetablePeriod[];
    hours: SchoolHours;
    showEndLabel: boolean;
    today: Date | null;
    onCreate: (weekday: Weekday, periodId: string) => void;
    onEdit: (slot: TimetableSlot) => void;
}) {
    const height = segmentHeightPx(
        segment.startsAt,
        segment.endsAt,
        hours,
        DAY_HEIGHT_PX,
    );

    if (segment.kind === 'break') {
        return (
            <>
                <div
                    className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-1.5 text-[10px]"
                    style={{ minHeight: height }}
                >
                    {segment.startsAt}
                </div>
                <div
                    className="border-border bg-muted/40 text-muted-foreground flex items-center justify-center border-t border-l text-[11px] font-medium tracking-[0.12em] uppercase"
                    style={{
                        gridColumn: `2 / span ${days.length}`,
                        minHeight: height,
                    }}
                >
                    {segment.label}
                </div>
                {showEndLabel ? (
                    <DayEndLabel endsAt={hours.endsAt} days={days.length} />
                ) : null}
            </>
        );
    }

    if (segment.kind === 'gap') {
        return (
            <>
                <div
                    className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-1.5 text-xs"
                    style={{ minHeight: height }}
                >
                    {segment.startsAt}
                </div>
                {days.map((day) => (
                    <div
                        key={`${day.toISOString()}-gap-${segment.startsAt}`}
                        className="border-border bg-muted/15 border-t border-l"
                        style={{ minHeight: height }}
                    />
                ))}
                {showEndLabel ? (
                    <DayEndLabel endsAt={hours.endsAt} days={days.length} />
                ) : null}
            </>
        );
    }

    const periodId = segment.period.id;

    return (
        <>
            <div
                className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-2 text-xs"
                style={{ minHeight: height }}
            >
                {segment.startsAt}
            </div>
            {days.map((day) => {
                const weekday = weekdayFromDate(day);

                if (!weekday) {
                    return (
                        <div
                            key={day.toISOString()}
                            className="border-border border-t border-l"
                            style={{ minHeight: height }}
                        />
                    );
                }

                const slot = findSlot(slots, classroomId, weekday, periodId);
                const exams = assessmentsOnPeriod(
                    catalog,
                    classroomId,
                    day,
                    periodId,
                );
                const isToday = today !== null && isSameDay(day, today);
                const display = slot ? slotDisplay(catalog, slot) : null;

                return (
                    <div
                        key={`${day.toISOString()}-${periodId}`}
                        className={cn(
                            'border-border group flex flex-col gap-1 border-t border-l p-1.5',
                            isToday && 'bg-primary/[0.03]',
                        )}
                        style={{ minHeight: height }}
                    >
                        {slot && display ? (
                            <div className="min-h-0 flex-1">
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
                                    onClick={() => onEdit(slot)}
                                />
                            </div>
                        ) : exams.length === 0 ? (
                            <button
                                type="button"
                                className="text-muted-foreground hover:border-primary hover:text-primary border-border/0 flex h-full min-h-[40px] w-full items-center justify-center rounded-md border border-dashed opacity-0 transition group-hover:opacity-100"
                                onClick={() => onCreate(weekday, periodId)}
                            >
                                <Plus className="size-4" />
                                <span className="sr-only">
                                    Ajouter un créneau
                                </span>
                            </button>
                        ) : null}
                        {exams.map((exam) => (
                            <TimetableEvent
                                key={exam.id}
                                tone="exam"
                                title={exam.name}
                                time={`${assessmentTypeLabel(exam.type)} · ${assessmentTimeRange(exam)}`}
                            />
                        ))}
                    </div>
                );
            })}
            {showEndLabel ? (
                <DayEndLabel endsAt={hours.endsAt} days={days.length} />
            ) : null}
        </>
    );
}

function DayEndLabel({ endsAt, days }: { endsAt: string; days: number }) {
    return (
        <>
            <div className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-1.5 pb-2 text-xs">
                {endsAt}
            </div>
            <div
                className="border-border border-t"
                style={{ gridColumn: `2 / span ${days}` }}
            />
        </>
    );
}
