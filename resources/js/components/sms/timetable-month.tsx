import { format, isSameDay, isSameMonth } from 'date-fns';
import type { EventTone } from '@/components/sms/timetable-event';
import { TimetableEvent } from '@/components/sms/timetable-event';
import { assessmentTypeLabel } from '@/lib/school-students';
import {
    assessmentTimeRange,
    assessmentsOnDate,
    periodLabel,
    schoolMonthWeeks,
    slotDisplay,
    slotsForWeekday,
    subjectTone,
    timetablePeriodsForClassroom,
    WEEKDAYS,
    weekdayFromDate,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';
import type { SchoolDataset, TimetableSlot, Weekday } from '@/types/school';

const MONTH_SLOTS = 3;

type DayEntry = {
    key: string;
    title: string;
    time: string;
    tone: EventTone;
    onClick?: () => void;
};

export function TimetableMonth({
    catalog,
    classroomId,
    slots,
    cursor,
    onSelectDay,
    onCreate,
    onEdit,
}: {
    catalog: SchoolDataset;
    classroomId: string;
    slots: TimetableSlot[];
    cursor: Date;
    onSelectDay: (day: Date) => void;
    onCreate: (weekday: Weekday, periodId: string) => void;
    onEdit: (slot: TimetableSlot) => void;
}) {
    const weeks = schoolMonthWeeks(cursor);
    const today = new Date();
    const periods = timetablePeriodsForClassroom(catalog, classroomId);
    const firstPeriodId = periods[0]?.id ?? 'p1';

    function entriesFor(day: Date): DayEntry[] {
        const weekday = weekdayFromDate(day);
        const lessons = weekday
            ? slotsForWeekday(slots, classroomId, weekday)
                  .slice()
                  .sort((left, right) =>
                      left.periodId.localeCompare(right.periodId),
                  )
                  .map<DayEntry>((slot) => ({
                      key: slot.id,
                      title: slotDisplay(catalog, slot).subjectName,
                      time: periodLabel(slot.periodId, periods).split(
                          ' – ',
                      )[0]!,
                      tone: subjectTone(catalog, slot.subjectId),
                      onClick: () => onEdit(slot),
                  }))
            : [];
        const exams = assessmentsOnDate(
            catalog,
            classroomId,
            day,
        ).map<DayEntry>((exam) => ({
            key: exam.id,
            title: `${assessmentTypeLabel(exam.type)} · ${exam.name}`,
            time: assessmentTimeRange(exam),
            tone: 'exam',
        }));

        return [...lessons, ...exams];
    }

    return (
        <div className="min-h-0 flex-1 overflow-auto">
            <div
                className="border-border grid divide-x border-b"
                style={{
                    gridTemplateColumns: `repeat(${WEEKDAYS.length}, minmax(0, 1fr))`,
                }}
            >
                {WEEKDAYS.map((day) => (
                    <div
                        key={day.id}
                        className="flex items-center justify-center py-2"
                    >
                        <span className="text-muted-foreground text-xs font-medium">
                            {day.label.slice(0, 3)}
                        </span>
                    </div>
                ))}
            </div>
            <div
                className="grid overflow-hidden"
                style={{
                    gridTemplateColumns: `repeat(${WEEKDAYS.length}, minmax(0, 1fr))`,
                }}
            >
                {weeks.map((week, weekIndex) =>
                    week.map((day, dayIndex) => {
                        const inMonth = isSameMonth(day, cursor);
                        const isToday = isSameDay(day, today);
                        const weekday = weekdayFromDate(day);
                        const entries = inMonth ? entriesFor(day) : [];
                        const extra = entries.length - MONTH_SLOTS;

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    'border-border',
                                    dayIndex > 0 && 'border-l',
                                    weekIndex > 0 && 'border-t',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex flex-col gap-1 py-2',
                                        !inMonth && 'opacity-50',
                                    )}
                                >
                                    <button
                                        type="button"
                                        className={cn(
                                            'flex h-6 items-center px-2 text-left text-xs font-semibold',
                                            isToday && 'text-primary',
                                        )}
                                        onClick={() => onSelectDay(day)}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                    <div className="flex h-[94px] flex-col gap-2">
                                        {Array.from({
                                            length: MONTH_SLOTS,
                                        }).map((_, slotIndex) => {
                                            const entry = entries[slotIndex];

                                            return (
                                                <div
                                                    key={slotIndex}
                                                    className="flex-1"
                                                >
                                                    {entry ? (
                                                        <TimetableEvent
                                                            title={entry.title}
                                                            time={entry.time}
                                                            tone={entry.tone}
                                                            onClick={
                                                                entry.onClick
                                                            }
                                                        />
                                                    ) : inMonth &&
                                                      weekday &&
                                                      slotIndex === 0 &&
                                                      entries.length === 0 ? (
                                                        <button
                                                            type="button"
                                                            className="h-full w-full"
                                                            onClick={() =>
                                                                onCreate(
                                                                    weekday,
                                                                    firstPeriodId,
                                                                )
                                                            }
                                                        >
                                                            <span className="sr-only">
                                                                Ajouter un
                                                                créneau
                                                            </span>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-muted-foreground h-[18px] px-1.5 text-xs font-semibold">
                                        {extra > 0 ? `${extra} de plus…` : ''}
                                    </p>
                                </div>
                            </div>
                        );
                    }),
                )}
            </div>
        </div>
    );
}
