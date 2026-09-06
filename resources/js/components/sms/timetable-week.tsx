import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { TimetableEvent } from '@/components/sms/timetable-event';
import { assessmentTypeLabel } from '@/lib/school-students';
import {
    assessmentTimeRange,
    assessmentsOnPeriod,
    breakCoveringTime,
    capitalizeFr,
    findSlot,
    firstHalfHourForPeriod,
    halfHourSlots,
    periodCoveringTime,
    periodLabel,
    resolvePeriodIdForTime,
    schoolHoursForClassroom,
    slotDisplay,
    subjectTone,
    timeToMinutes,
    timetablePeriodsForClassroom,
    weekdayFromDate,
    type HalfHourSlot,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';
import type {
    SchoolDataset,
    SchoolHours,
    TimetablePeriod,
    TimetableSlot,
    Weekday,
} from '@/types/school';

/** Pixel height of one full 30-minute box. */
const HALF_HOUR_HEIGHT_PX = 56;

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
    const halves = halfHourSlots(hours);

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

            {halves.map((half, index) => (
                <HalfHourRow
                    key={half.startsAt}
                    catalog={catalog}
                    classroomId={classroomId}
                    slots={slots}
                    days={days}
                    half={half}
                    halves={halves}
                    periods={periods}
                    hours={hours}
                    showEndLabel={index === halves.length - 1}
                    today={singleDay ? null : today}
                    onCreate={onCreate}
                    onEdit={onEdit}
                />
            ))}
        </div>
    );
}

function halfHeight(half: HalfHourSlot): number {
    return Math.max(24, (half.minutes / 30) * HALF_HOUR_HEIGHT_PX);
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

function HalfHourRow({
    catalog,
    classroomId,
    slots,
    days,
    half,
    halves,
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
    half: HalfHourSlot;
    halves: HalfHourSlot[];
    periods: TimetablePeriod[];
    hours: SchoolHours;
    showEndLabel: boolean;
    today: Date | null;
    onCreate: (weekday: Weekday, periodId: string) => void;
    onEdit: (slot: TimetableSlot) => void;
}) {
    const height = halfHeight(half);
    const pause = breakCoveringTime(hours, half.startsAt);
    const periodCover = periodCoveringTime(periods, half.startsAt);
    const periodHead =
        periodCover === null
            ? null
            : firstHalfHourForPeriod(halves, periodCover, periods);
    const isPeriodHead =
        periodCover !== null && periodHead?.startsAt === half.startsAt;
    const isPeriodContinuation = periodCover !== null && !isPeriodHead;

    return (
        <>
            <div
                className="text-muted-foreground border-border flex items-start justify-end border-t px-2 pt-1.5 text-xs leading-none"
                style={{ height }}
            >
                {half.startsAt}
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

                if (pause) {
                    const showLabel = pause.startsAt === half.startsAt;

                    return (
                        <div
                            key={`${day.toISOString()}-${half.startsAt}-break`}
                            className="border-border bg-muted/40 text-muted-foreground flex items-center justify-center border-t border-l text-[10px] font-medium tracking-[0.1em] uppercase"
                            style={{ height }}
                        >
                            {showLabel ? pause.label : null}
                        </div>
                    );
                }

                if (isPeriodContinuation) {
                    return (
                        <div
                            key={`${day.toISOString()}-${half.startsAt}-cont`}
                            className={cn(
                                'border-border border-t border-l',
                                isToday && 'bg-primary/[0.03]',
                            )}
                            style={{ height }}
                        />
                    );
                }

                const period = periodCover;
                const periodId =
                    period?.id ??
                    resolvePeriodIdForTime(periods, half.startsAt);

                if (period && isPeriodHead) {
                    const slot = findSlot(
                        slots,
                        classroomId,
                        weekday,
                        period.id,
                    );
                    const exams = assessmentsOnPeriod(
                        catalog,
                        classroomId,
                        day,
                        period.id,
                    );
                    const display = slot ? slotDisplay(catalog, slot) : null;
                    const spanMinutes = Math.max(
                        30,
                        timeToMinutes(period.endsAt) -
                            timeToMinutes(half.startsAt),
                    );
                    const eventHeight = Math.max(
                        height,
                        (spanMinutes / 30) * HALF_HOUR_HEIGHT_PX - 2,
                    );

                    return (
                        <div
                            key={`${day.toISOString()}-${half.startsAt}-period`}
                            className={cn(
                                'border-border group relative overflow-visible border-t border-l p-1',
                                isToday && 'bg-primary/[0.03]',
                            )}
                            style={{ height }}
                        >
                            <div
                                className="absolute inset-x-1 top-1 z-10 flex flex-col gap-1"
                                style={{ height: eventHeight }}
                            >
                                {slot && display ? (
                                    <TimetableEvent
                                        block
                                        tone={subjectTone(
                                            catalog,
                                            slot.subjectId,
                                        )}
                                        title={display.subjectName}
                                        time={periodLabel(
                                            slot.periodId,
                                            periods,
                                        )}
                                        hint={
                                            display.room
                                                ? `${display.teacherLastName} · ${display.room}`
                                                : display.teacherLastName
                                        }
                                        onClick={() => onEdit(slot)}
                                    />
                                ) : exams.length === 0 && periodId ? (
                                    <AddBox
                                        height={eventHeight}
                                        onClick={() =>
                                            onCreate(weekday, periodId)
                                        }
                                    />
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
                        </div>
                    );
                }

                return (
                    <div
                        key={`${day.toISOString()}-${half.startsAt}-add`}
                        className={cn(
                            'border-border group relative border-t border-l p-1',
                            isToday && 'bg-primary/[0.03]',
                        )}
                        style={{ height }}
                    >
                        {periodId ? (
                            <AddBox
                                height={height}
                                onClick={() => onCreate(weekday, periodId)}
                            />
                        ) : null}
                    </div>
                );
            })}
            {showEndLabel ? (
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
        </>
    );
}
