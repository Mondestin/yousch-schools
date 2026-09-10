import { attendanceLabel } from '@/lib/school-office';
import { cycleLabel } from '@/lib/school-rows';
import type {
    AttendanceStatus,
    Cycle,
    PaymentStatus,
    SchoolDataset,
} from '@/types/school';

/** Purple ramp declared in app.css, reused by every chart. */
export const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

/** Solid fills aligned with CycleBadge tones. */
export const CYCLE_CHART_COLORS: Record<Cycle, string> = {
    prescolaire: 'var(--event-rose)',
    primaire: 'var(--event-blue)',
    college: 'var(--event-teal)',
    lycee_general: 'var(--event-purple)',
    lycee_technique: 'var(--event-amber)',
};

const PRIMAIRE_GRADE_SHADES = [
    'var(--event-blue)',
    'color-mix(in srgb, var(--event-blue) 82%, white)',
    'color-mix(in srgb, var(--event-blue) 68%, white)',
    'color-mix(in srgb, var(--event-blue) 54%, white)',
    'color-mix(in srgb, var(--event-blue) 78%, #0a0a0a)',
    'color-mix(in srgb, var(--event-blue) 62%, #0a0a0a)',
];

function yearEnrollments(catalog: SchoolDataset, academicYearId: string) {
    const classrooms = new Map(
        catalog.classrooms.map((classroom) => [classroom.id, classroom]),
    );

    return catalog.enrollments
        .filter(
            (enrollment) =>
                enrollment.academicYearId === academicYearId &&
                enrollment.status === 'inscrit',
        )
        .map((enrollment) => ({
            enrollment,
            classroom: classrooms.get(enrollment.classroomId) ?? null,
        }))
        .filter(
            (
                row,
            ): row is {
                enrollment: (typeof catalog.enrollments)[number];
                classroom: (typeof catalog.classrooms)[number];
            } => row.classroom !== null,
        );
}

/**
 * Collected vs still-owed fees per cycle for one billing month.
 */
export function collectionByCycle(
    catalog: SchoolDataset,
    academicYearId: string,
    month: string,
): {
    cycle: Cycle;
    label: string;
    collected: number;
    outstanding: number;
    expected: number;
    rate: number;
}[] {
    const rows = yearEnrollments(catalog, academicYearId);
    const cycleOf = new Map(
        rows.map(({ enrollment, classroom }) => [
            enrollment.id,
            classroom.cycle,
        ]),
    );
    const totals = new Map<Cycle, { collected: number; expected: number }>();

    for (const payment of catalog.payments) {
        const cycle = cycleOf.get(payment.enrollmentId);

        if (!cycle || payment.month !== month) {
            continue;
        }

        const bucket = totals.get(cycle) ?? { collected: 0, expected: 0 };

        bucket.collected += payment.amount;
        bucket.expected += payment.expectedAmount;
        totals.set(cycle, bucket);
    }

    return catalog.cycles
        .map((cycle) => {
            const bucket = totals.get(cycle.value) ?? {
                collected: 0,
                expected: 0,
            };

            return {
                cycle: cycle.value,
                label: cycle.label,
                collected: bucket.collected,
                outstanding: Math.max(bucket.expected - bucket.collected, 0),
                expected: bucket.expected,
                rate:
                    bucket.expected === 0
                        ? 0
                        : Math.round(
                              (bucket.collected / bucket.expected) * 100,
                          ),
            };
        })
        .filter((row) => row.expected > 0);
}

export function collectionTotals(rows: ReturnType<typeof collectionByCycle>): {
    collected: number;
    expected: number;
    outstanding: number;
    rate: number;
} {
    const collected = rows.reduce((sum, row) => sum + row.collected, 0);
    const expected = rows.reduce((sum, row) => sum + row.expected, 0);

    return {
        collected,
        expected,
        outstanding: Math.max(expected - collected, 0),
        rate: expected === 0 ? 0 : Math.round((collected / expected) * 100),
    };
}

/** Headcount per cycle, ready to plot as a donut.
 * Primaire is expanded by grade level (blue family); other cycles use badge colors.
 */
export function headcountByCycle(
    catalog: SchoolDataset,
    academicYearId: string,
): { id: string; cycle: Cycle; label: string; count: number; fill: string }[] {
    const rows = yearEnrollments(catalog, academicYearId);
    const gradeLevels = [...catalog.gradeLevels].sort(
        (left, right) =>
            left.cycle.localeCompare(right.cycle) ||
            left.position - right.position,
    );
    const primaireGrades = gradeLevels.filter(
        (grade) => grade.cycle === 'primaire',
    );
    const slices: {
        id: string;
        cycle: Cycle;
        label: string;
        count: number;
        fill: string;
    }[] = [];

    let primaireIndex = 0;

    for (const grade of primaireGrades) {
        const count = rows.filter(
            ({ classroom }) => classroom.gradeLevelId === grade.id,
        ).length;

        if (count === 0) {
            continue;
        }

        slices.push({
            id: grade.id,
            cycle: 'primaire',
            label: `Primaire · ${grade.code}`,
            count,
            fill: PRIMAIRE_GRADE_SHADES[
                primaireIndex % PRIMAIRE_GRADE_SHADES.length
            ],
        });
        primaireIndex += 1;
    }

    for (const cycle of catalog.cycles) {
        if (cycle.value === 'primaire') {
            continue;
        }

        const count = rows.filter(
            ({ classroom }) => classroom.cycle === cycle.value,
        ).length;

        if (count === 0) {
            continue;
        }

        slices.push({
            id: cycle.value,
            cycle: cycle.value,
            label: cycle.label,
            count,
            fill: CYCLE_CHART_COLORS[cycle.value],
        });
    }

    return slices;
}

/** Girls vs boys among enrolled students for the year. */
export function genderMix(
    catalog: SchoolDataset,
    academicYearId: string,
): { key: 'fille' | 'garcon'; label: string; count: number; fill: string }[] {
    const studentsById = new Map(
        catalog.students.map((student) => [student.id, student]),
    );
    const rows = yearEnrollments(catalog, academicYearId);
    let filles = 0;
    let garcons = 0;

    for (const { enrollment } of rows) {
        const student = studentsById.get(enrollment.studentId);

        if (student?.gender === 'femme') {
            filles += 1;
        } else if (student?.gender === 'homme') {
            garcons += 1;
        }
    }

    return [
        {
            key: 'fille' as const,
            label: 'Filles',
            count: filles,
            fill: 'var(--brand-secondary)',
        },
        {
            key: 'garcon' as const,
            label: 'Garçons',
            count: garcons,
            fill: 'var(--primary)',
        },
    ].filter((row) => row.count > 0);
}

/** Occupancy per classroom: enrolled headcount against declared capacity. */
export function occupancyByClassroom(
    catalog: SchoolDataset,
    academicYearId: string,
): { id: string; label: string; count: number; capacity: number }[] {
    const rows = yearEnrollments(catalog, academicYearId);

    return catalog.classrooms
        .filter((classroom) => classroom.academicYearId === academicYearId)
        .map((classroom) => ({
            id: classroom.id,
            label: classroom.name,
            count: rows.filter(
                ({ enrollment }) => enrollment.classroomId === classroom.id,
            ).length,
            capacity: classroom.capacity,
        }));
}

export function attendanceDates(catalog: SchoolDataset): string[] {
    return [...new Set(catalog.attendance.map((mark) => mark.date))].sort();
}

function toIsoDay(date: Date): string {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parseIsoDay(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

/** Presence rate for the last 7 days (full week), oldest first. */
export function attendanceTrend(
    catalog: SchoolDataset,
    academicYearId: string,
): { date: string; label: string; rate: number | null; absences: number }[] {
    const rows = yearEnrollments(catalog, academicYearId);
    const scoped = new Set(rows.map(({ enrollment }) => enrollment.id));
    const knownDates = attendanceDates(catalog);
    const endIso =
        knownDates.at(-1) ??
        toIsoDay(new Date());
    const end = parseIsoDay(endIso);
    const days: { date: string; label: string; rate: number | null; absences: number }[] =
        [];

    for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date(end);
        day.setDate(end.getDate() - offset);
        const date = toIsoDay(day);
        const marks = catalog.attendance.filter(
            (mark) => mark.date === date && scoped.has(mark.enrollmentId),
        );
        const present = marks.filter(
            (mark) => mark.status === 'present' || mark.status === 'retard',
        ).length;

        days.push({
            date,
            label: new Intl.DateTimeFormat('fr-FR', {
                weekday: 'short',
                day: '2-digit',
            }).format(day),
            rate:
                marks.length === 0
                    ? null
                    : Math.round((present / marks.length) * 100),
            absences: marks.filter((mark) => mark.status === 'absent').length,
        });
    }

    return days;
}

/** Breakdown of a day's roll call, ready to plot as a donut. */
export function attendanceMix(
    catalog: SchoolDataset,
    academicYearId: string,
    date: string,
): { status: AttendanceStatus; label: string; count: number; fill: string }[] {
    const rows = yearEnrollments(catalog, academicYearId);
    const scoped = new Set(rows.map(({ enrollment }) => enrollment.id));
    const marks = catalog.attendance.filter(
        (mark) => mark.date === date && scoped.has(mark.enrollmentId),
    );
    const tones: Record<AttendanceStatus, string> = {
        present: 'var(--success)',
        retard: 'var(--brand-secondary)',
        absent: 'var(--danger)',
        excuse: 'var(--event-blue)',
    };

    return (['present', 'retard', 'absent', 'excuse'] as AttendanceStatus[])
        .map((status) => ({
            status,
            label: attendanceLabel(status),
            count: marks.filter((mark) => mark.status === status).length,
            fill: tones[status],
        }))
        .filter((row) => row.count > 0);
}

/** Count of dossiers per payment status for one billing month. */
export function paymentMix(
    catalog: SchoolDataset,
    academicYearId: string,
    month: string,
): { status: PaymentStatus; label: string; count: number }[] {
    const rows = yearEnrollments(catalog, academicYearId);
    const scoped = new Set(rows.map(({ enrollment }) => enrollment.id));
    const payments = catalog.payments.filter(
        (payment) =>
            payment.month === month && scoped.has(payment.enrollmentId),
    );
    const labels: Record<PaymentStatus, string> = {
        paye: 'Payé',
        partiel: 'Partiel',
        impaye: 'Impayé',
    };

    return (['paye', 'partiel', 'impaye'] as PaymentStatus[]).map((status) => ({
        status,
        label: labels[status],
        count: payments.filter((payment) => payment.status === status).length,
    }));
}

export function cycleShortLabel(cycle: Cycle): string {
    const full = cycleLabel(cycle);

    return full.replace('Lycée ', 'Lyc. ');
}
