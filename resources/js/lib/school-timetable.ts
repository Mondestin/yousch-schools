import {
    addDays,
    addMonths,
    addWeeks,
    endOfMonth,
    format,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { personName } from '@/lib/school-rows';
import type {
    Assessment,
    Cycle,
    CycleYearFilter,
    CycleSchedule,
    SchoolBreak,
    SchoolDataset,
    SchoolHours,
    TimetablePeriod,
    TimetableSlot,
    Weekday,
} from '@/types/school';

export type TimetableView = 'day' | 'week' | 'month';

export const WEEKDAYS: { id: Weekday; label: string }[] = [
    { id: 'lundi', label: 'Lundi' },
    { id: 'mardi', label: 'Mardi' },
    { id: 'mercredi', label: 'Mercredi' },
    { id: 'jeudi', label: 'Jeudi' },
    { id: 'vendredi', label: 'Vendredi' },
    { id: 'samedi', label: 'Samedi' },
];

export const TIMETABLE_PERIODS: TimetablePeriod[] = [
    { id: 'p1', startsAt: '07:30', endsAt: '08:25' },
    { id: 'p2', startsAt: '08:25', endsAt: '09:20' },
    { id: 'p3', startsAt: '09:20', endsAt: '10:15' },
    { id: 'p4', startsAt: '10:35', endsAt: '11:30' },
    { id: 'p5', startsAt: '11:30', endsAt: '12:25' },
    { id: 'p6', startsAt: '13:30', endsAt: '14:25' },
];

export const DEFAULT_SCHOOL_HOURS: SchoolHours = {
    startsAt: '07:30',
    endsAt: '14:25',
    recess: { startsAt: '10:15', endsAt: '10:35' },
    lunch: { startsAt: '12:25', endsAt: '13:30' },
};

export function defaultCycleSchedule(cycle: Cycle): CycleSchedule {
    return {
        cycle,
        hours: {
            startsAt: DEFAULT_SCHOOL_HOURS.startsAt,
            endsAt: DEFAULT_SCHOOL_HOURS.endsAt,
            recess: DEFAULT_SCHOOL_HOURS.recess
                ? { ...DEFAULT_SCHOOL_HOURS.recess }
                : null,
            lunch: DEFAULT_SCHOOL_HOURS.lunch
                ? { ...DEFAULT_SCHOOL_HOURS.lunch }
                : null,
        },
        periods: TIMETABLE_PERIODS.map((period) => ({ ...period })),
    };
}

export function timetablePeriods(
    catalog: Pick<SchoolDataset, 'schedules'>,
    cycle?: Cycle | null,
): TimetablePeriod[] {
    const found = catalog.schedules?.find((item) => item.cycle === cycle);
    const source =
        found?.periods && found.periods.length > 0
            ? found.periods
            : TIMETABLE_PERIODS;

    return [...source].sort(
        (left, right) =>
            left.startsAt.localeCompare(right.startsAt) ||
            left.endsAt.localeCompare(right.endsAt),
    );
}

export function schoolHoursOf(
    catalog: Pick<SchoolDataset, 'schedules'>,
    cycle?: Cycle | null,
): SchoolHours {
    return (
        catalog.schedules?.find((item) => item.cycle === cycle)?.hours ??
        DEFAULT_SCHOOL_HOURS
    );
}

export function timetablePeriodsForClassroom(
    catalog: Pick<SchoolDataset, 'schedules' | 'classrooms'>,
    classroomId: string,
): TimetablePeriod[] {
    const cycle = catalog.classrooms.find(
        (item) => item.id === classroomId,
    )?.cycle;

    return timetablePeriods(catalog, cycle);
}

export function schoolHoursForClassroom(
    catalog: Pick<SchoolDataset, 'schedules' | 'classrooms'>,
    classroomId: string,
): SchoolHours {
    const cycle = catalog.classrooms.find(
        (item) => item.id === classroomId,
    )?.cycle;

    return schoolHoursOf(catalog, cycle);
}

export function periodLabel(
    periodId: string,
    periods: readonly TimetablePeriod[] = TIMETABLE_PERIODS,
): string {
    const period = periods.find((item) => item.id === periodId);

    return period ? `${period.startsAt} – ${period.endsAt}` : periodId;
}

export function weekdayLabel(weekday: Weekday): string {
    return WEEKDAYS.find((day) => day.id === weekday)?.label ?? weekday;
}

export function schoolMonday(date: Date): Date {
    return startOfWeek(date, { weekStartsOn: 1 });
}

export function schoolWeekDays(date: Date): Date[] {
    const monday = schoolMonday(date);

    return WEEKDAYS.map((_, index) => addDays(monday, index));
}

export function weekdayFromDate(date: Date): Weekday | null {
    const day = date.getDay();

    if (day === 0) {
        return null;
    }

    return WEEKDAYS[day - 1]?.id ?? null;
}

export function capitalizeFr(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCalendarHeading(date: Date): string {
    return capitalizeFr(format(date, 'LLLL yyyy', { locale: fr }));
}

export function formatCalendarNavDate(date: Date): string {
    return capitalizeFr(format(date, 'd MMMM yyyy', { locale: fr }));
}

export function formatDayHeading(date: Date): string {
    return capitalizeFr(format(date, 'EEEE d MMMM yyyy', { locale: fr }));
}

export function formatCalendarRange(date: Date, view: TimetableView): string {
    if (view === 'day') {
        return formatCalendarNavDate(date);
    }

    const [start, end] =
        view === 'week'
            ? [schoolWeekDays(date)[0]!, schoolWeekDays(date).at(-1)!]
            : [startOfMonth(date), endOfMonth(date)];

    return `${format(start, 'd MMM yyyy', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`;
}

export function shiftCalendarDate(
    date: Date,
    view: TimetableView,
    direction: -1 | 1,
): Date {
    if (view === 'month') {
        return addMonths(date, direction);
    }

    if (view === 'week') {
        return addWeeks(date, direction);
    }

    let next = addDays(date, direction);

    if (next.getDay() === 0) {
        next = addDays(next, direction);
    }

    return next;
}

export function schoolMonthWeeks(date: Date): Date[][] {
    const monthEnd = endOfMonth(date);
    let cursor = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
    const weeks: Date[][] = [];

    while (cursor <= monthEnd || weeks.length === 0) {
        weeks.push(WEEKDAYS.map((_, index) => addDays(cursor, index)));
        cursor = addDays(cursor, 7);

        if (weeks.length > 6) {
            break;
        }
    }

    return weeks;
}

export function slotsForWeekday(
    slots: TimetableSlot[],
    classroomId: string,
    weekday: Weekday,
): TimetableSlot[] {
    return slots.filter(
        (slot) => slot.classroomId === classroomId && slot.weekday === weekday,
    );
}

export function parseIsoLocal(iso: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        return null;
    }

    const [year, month, day] = iso.split('-').map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

export function weekdayFromIso(iso: string): Weekday | null {
    const date = parseIsoLocal(iso);

    return date ? weekdayFromDate(date) : null;
}

function periodSortIndex(
    periodId: string,
    periods: readonly TimetablePeriod[] = TIMETABLE_PERIODS,
): number {
    const index = periods.findIndex((item) => item.id === periodId);

    return index === -1 ? 99 : index;
}

/** Lessons on the weekly timetable for that class and calendar day. */
export function lessonsOnDate(
    slots: TimetableSlot[],
    classroomId: string,
    dateIso: string,
    periods: readonly TimetablePeriod[] = TIMETABLE_PERIODS,
): TimetableSlot[] {
    const weekday = weekdayFromIso(dateIso);

    if (!weekday) {
        return [];
    }

    return slotsForWeekday(slots, classroomId, weekday)
        .slice()
        .sort(
            (left, right) =>
                periodSortIndex(left.periodId, periods) -
                periodSortIndex(right.periodId, periods),
        );
}

export function lessonOptionLabel(
    catalog: SchoolDataset,
    slot: TimetableSlot,
): string {
    const display = slotDisplay(catalog, slot);

    return `${periodLabel(slot.periodId, timetablePeriodsForClassroom(catalog, slot.classroomId))} · ${display.subjectName}`;
}

export function periodsOverlap(
    left: Pick<TimetablePeriod, 'startsAt' | 'endsAt'>,
    right: Pick<TimetablePeriod, 'startsAt' | 'endsAt'>,
): boolean {
    return left.startsAt < right.endsAt && right.startsAt < left.endsAt;
}

export function completeBreak(item: SchoolBreak | null): SchoolBreak | null {
    if (!item?.startsAt || !item?.endsAt) {
        return null;
    }

    return item;
}

export function schoolBreaks(
    hours: SchoolHours,
): Array<SchoolBreak & { label: string }> {
    const items: Array<SchoolBreak & { label: string }> = [];
    const recess = completeBreak(hours.recess);
    const lunch = completeBreak(hours.lunch);

    if (recess) {
        items.push({ ...recess, label: 'Récréation' });
    }

    if (lunch) {
        items.push({ ...lunch, label: 'Pause de midi' });
    }

    return items.sort((left, right) =>
        left.startsAt.localeCompare(right.startsAt),
    );
}

export function periodFitsHours(
    period: Pick<TimetablePeriod, 'startsAt' | 'endsAt'>,
    hours: SchoolHours,
): boolean {
    if (
        period.startsAt < hours.startsAt ||
        period.endsAt > hours.endsAt ||
        period.startsAt >= period.endsAt
    ) {
        return false;
    }

    return !schoolBreaks(hours).some((item) => periodsOverlap(period, item));
}

export function timeToMinutes(time: string): number {
    const [hoursPart, minutesPart] = time.split(':').map(Number);

    return (hoursPart ?? 0) * 60 + (minutesPart ?? 0);
}

export function minutesToTime(total: number): string {
    const hoursPart = Math.floor(total / 60);
    const minutesPart = total % 60;

    return `${String(hoursPart).padStart(2, '0')}:${String(minutesPart).padStart(2, '0')}`;
}

export function schoolDayLengthMinutes(hours: SchoolHours): number {
    return Math.max(
        1,
        timeToMinutes(hours.endsAt) - timeToMinutes(hours.startsAt),
    );
}

export const QUARTER_HOUR_MINUTES = 15;
export const HALF_HOUR_MINUTES = 30;

export type QuarterHourSlot = {
    startsAt: string;
    endsAt: string;
    minutes: number;
};

export type HalfHourSlot = QuarterHourSlot;

function timedSlots(
    hours: SchoolHours,
    stepMinutes: number,
): QuarterHourSlot[] {
    const dayStart = timeToMinutes(hours.startsAt);
    const dayEnd = timeToMinutes(hours.endsAt);

    if (dayStart >= dayEnd) {
        return [];
    }

    const slots: QuarterHourSlot[] = [];

    for (let minute = dayStart; minute < dayEnd; minute += stepMinutes) {
        const end = Math.min(minute + stepMinutes, dayEnd);

        slots.push({
            startsAt: minutesToTime(minute),
            endsAt: minutesToTime(end),
            minutes: end - minute,
        });
    }

    return slots;
}

/** 15-minute boxes covering ouverture → fermeture. */
export function quarterHourSlots(hours: SchoolHours): QuarterHourSlot[] {
    return timedSlots(hours, QUARTER_HOUR_MINUTES);
}

/** 30-minute boxes covering ouverture → fermeture. */
export function halfHourSlots(hours: SchoolHours): HalfHourSlot[] {
    return timedSlots(hours, HALF_HOUR_MINUTES);
}

export function periodStartingAt(
    periods: readonly TimetablePeriod[],
    time: string,
): TimetablePeriod | null {
    return periods.find((period) => period.startsAt === time) ?? null;
}

export function periodCoveringTime(
    periods: readonly TimetablePeriod[],
    time: string,
): TimetablePeriod | null {
    return (
        periods.find(
            (period) => period.startsAt <= time && time < period.endsAt,
        ) ?? null
    );
}

/**
 * First 30-min grid row that intersects a lesson period.
 * Periods often start off the half-hour (e.g. 08:25); the grid is :00/:30 only.
 */
export function firstHalfHourForPeriod(
    halves: readonly HalfHourSlot[],
    period: Pick<TimetablePeriod, 'id' | 'startsAt' | 'endsAt'>,
    periods: readonly TimetablePeriod[],
): HalfHourSlot | null {
    return (
        halves.find(
            (half) =>
                periodCoveringTime(periods, half.startsAt)?.id === period.id,
        ) ?? null
    );
}

/** Prefer a period that starts at this time, else one covering it, else nearest start. */
export function resolvePeriodIdForTime(
    periods: readonly TimetablePeriod[],
    time: string,
): string | null {
    const exact = periodStartingAt(periods, time);

    if (exact) {
        return exact.id;
    }

    const covering = periodCoveringTime(periods, time);

    if (covering) {
        return covering.id;
    }

    if (periods.length === 0) {
        return null;
    }

    const target = timeToMinutes(time);
    let best = periods[0]!;
    let bestDistance = Math.abs(timeToMinutes(best.startsAt) - target);

    for (const period of periods.slice(1)) {
        const distance = Math.abs(timeToMinutes(period.startsAt) - target);

        if (distance < bestDistance) {
            best = period;
            bestDistance = distance;
        }
    }

    return best.id;
}

export function breakCoveringTime(
    hours: SchoolHours,
    time: string,
): (SchoolBreak & { label: string }) | null {
    return (
        schoolBreaks(hours).find(
            (item) => item.startsAt <= time && time < item.endsAt,
        ) ?? null
    );
}

export type TimetableDaySegment =
    | {
          kind: 'period';
          startsAt: string;
          endsAt: string;
          period: TimetablePeriod;
      }
    | {
          kind: 'break';
          startsAt: string;
          endsAt: string;
          label: string;
      }
    | {
          kind: 'gap';
          startsAt: string;
          endsAt: string;
      };

/**
 * Full school-day timeline from ouverture → fermeture, with periods,
 * pauses, and empty gaps filling the day length.
 */
export function timetableDaySegments(
    periods: readonly TimetablePeriod[],
    hours: SchoolHours,
): TimetableDaySegment[] {
    const dayStart = hours.startsAt;
    const dayEnd = hours.endsAt;

    if (dayStart >= dayEnd) {
        return [];
    }

    const events: Array<
        | {
              kind: 'period';
              startsAt: string;
              endsAt: string;
              period: TimetablePeriod;
          }
        | { kind: 'break'; startsAt: string; endsAt: string; label: string }
    > = [
        ...periods
            .filter(
                (period) =>
                    period.startsAt < dayEnd &&
                    period.endsAt > dayStart &&
                    period.startsAt < period.endsAt,
            )
            .map((period) => ({
                kind: 'period' as const,
                startsAt:
                    period.startsAt < dayStart ? dayStart : period.startsAt,
                endsAt: period.endsAt > dayEnd ? dayEnd : period.endsAt,
                period,
            })),
        ...schoolBreaks(hours)
            .filter((item) => item.startsAt < dayEnd && item.endsAt > dayStart)
            .map((item) => ({
                kind: 'break' as const,
                startsAt: item.startsAt < dayStart ? dayStart : item.startsAt,
                endsAt: item.endsAt > dayEnd ? dayEnd : item.endsAt,
                label: item.label,
            })),
    ].sort(
        (left, right) =>
            left.startsAt.localeCompare(right.startsAt) ||
            left.endsAt.localeCompare(right.endsAt),
    );

    const segments: TimetableDaySegment[] = [];
    let cursor = dayStart;

    for (const event of events) {
        if (event.startsAt > cursor) {
            segments.push({
                kind: 'gap',
                startsAt: cursor,
                endsAt: event.startsAt,
            });
        }

        if (event.startsAt < cursor) {
            continue;
        }

        segments.push(event);
        cursor = event.endsAt > cursor ? event.endsAt : cursor;
    }

    if (cursor < dayEnd) {
        segments.push({
            kind: 'gap',
            startsAt: cursor,
            endsAt: dayEnd,
        });
    }

    return segments;
}

export function segmentHeightPx(
    startsAt: string,
    endsAt: string,
    hours: SchoolHours,
    dayHeightPx: number,
): number {
    const duration = timeToMinutes(endsAt) - timeToMinutes(startsAt);

    return Math.max(
        8,
        (duration / schoolDayLengthMinutes(hours)) * dayHeightPx,
    );
}

export function breaksAfter(
    current: TimetablePeriod,
    next: TimetablePeriod | undefined,
    hours: SchoolHours,
): Array<{ time: string; label: string }> {
    const until = next?.startsAt ?? hours.endsAt;

    return schoolBreaks(hours)
        .filter(
            (item) => item.startsAt >= current.endsAt && item.startsAt < until,
        )
        .map((item) => ({
            time: item.startsAt,
            label: item.label,
        }));
}

export function assessmentsOnDate(
    catalog: SchoolDataset,
    classroomId: string,
    date: Date,
): Assessment[] {
    const heldOn = format(date, 'yyyy-MM-dd');

    return catalog.assessments.filter(
        (assessment) =>
            assessment.classroomId === classroomId &&
            assessment.heldOn === heldOn,
    );
}

export function visibleLessonCount(
    slots: TimetableSlot[],
    classroomId: string,
    days: Date[],
): number {
    return days.reduce((count, day) => {
        const weekday = weekdayFromDate(day);

        if (!weekday) {
            return count;
        }

        return count + slotsForWeekday(slots, classroomId, weekday).length;
    }, 0);
}

export function formatWeekRange(date: Date): string {
    const days = schoolWeekDays(date);
    const start = days[0];
    const end = days[days.length - 1];

    if (!start || !end) {
        return '';
    }

    return `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`;
}

export function teacherInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

export function classroomsForTimetable(
    catalog: SchoolDataset,
    filter: CycleYearFilter,
) {
    return catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
}

export function findSlot(
    slots: TimetableSlot[],
    classroomId: string,
    weekday: Weekday,
    periodId: string,
): TimetableSlot | undefined {
    return slots.find(
        (slot) =>
            slot.classroomId === classroomId &&
            slot.weekday === weekday &&
            slot.periodId === periodId,
    );
}

export function slotConflict(
    slots: TimetableSlot[],
    draft: Pick<
        TimetableSlot,
        'id' | 'classroomId' | 'weekday' | 'periodId' | 'teacherId'
    >,
): 'classroom' | 'teacher' | null {
    const sameHour = slots.filter(
        (slot) =>
            slot.id !== draft.id &&
            slot.weekday === draft.weekday &&
            slot.periodId === draft.periodId,
    );

    if (sameHour.some((slot) => slot.classroomId === draft.classroomId)) {
        return 'classroom';
    }

    if (sameHour.some((slot) => slot.teacherId === draft.teacherId)) {
        return 'teacher';
    }

    return null;
}

export function defaultHeldUntil(
    heldAt: string,
    type: Assessment['type'] = 'devoir',
    periods: readonly TimetablePeriod[] = TIMETABLE_PERIODS,
): string {
    const startIndex = periods.findIndex((item) => item.startsAt === heldAt);
    const span = type === 'devoir' ? 1 : 2;

    if (startIndex === -1) {
        return periods[0]?.endsAt ?? '09:20';
    }

    const endPeriod =
        periods[Math.min(startIndex + span - 1, periods.length - 1)];

    return endPeriod?.endsAt ?? heldAt;
}

export function assessmentTimeRange(
    assessment: Pick<Assessment, 'heldAt' | 'heldUntil'>,
): string {
    return `${assessment.heldAt} – ${assessment.heldUntil}`;
}

export function periodOverlapsRange(
    periodId: string,
    heldAt: string,
    heldUntil: string,
    periods: readonly TimetablePeriod[] = TIMETABLE_PERIODS,
): boolean {
    const period = periods.find((item) => item.id === periodId);

    if (!period) {
        return false;
    }

    return heldAt < period.endsAt && heldUntil > period.startsAt;
}

export function periodFromTime(
    time: string,
    periods: readonly TimetablePeriod[] = TIMETABLE_PERIODS,
): string | null {
    const period = periods.find(
        (item) => time >= item.startsAt && time < item.endsAt,
    );

    if (period) {
        return period.id;
    }

    return periods.find((item) => item.startsAt === time)?.id ?? null;
}

export function assessmentsOnPeriod(
    catalog: SchoolDataset,
    classroomId: string,
    date: Date,
    periodId: string,
) {
    const heldOn = format(date, 'yyyy-MM-dd');
    const periods = timetablePeriodsForClassroom(catalog, classroomId);

    return catalog.assessments.filter(
        (assessment) =>
            assessment.classroomId === classroomId &&
            assessment.heldOn === heldOn &&
            periodOverlapsRange(
                periodId,
                assessment.heldAt,
                assessment.heldUntil,
                periods,
            ),
    );
}

/** Ordered so neighbouring matières never land on adjacent hues. */
export const SUBJECT_TONES = [
    'purple',
    'amber',
    'teal',
    'rose',
    'blue',
    'green',
] as const;

export type SubjectTone = (typeof SUBJECT_TONES)[number];

export function subjectTone(
    catalog: SchoolDataset,
    subjectId: string,
): SubjectTone {
    const index = catalog.subjects.findIndex((item) => item.id === subjectId);

    return SUBJECT_TONES[
        (index < 0 ? 0 : index) % SUBJECT_TONES.length
    ] as SubjectTone;
}

export function slotDisplay(catalog: SchoolDataset, slot: TimetableSlot) {
    const subject = catalog.subjects.find((item) => item.id === slot.subjectId);
    const teacher = catalog.teachers.find((item) => item.id === slot.teacherId);

    return {
        subjectName: subject?.name ?? slot.subjectId,
        subjectCode: subject?.code ?? '',
        teacherName: teacher ? personName(teacher) : slot.teacherId,
        teacherLastName: teacher?.lastName ?? '',
        room: slot.room,
    };
}
