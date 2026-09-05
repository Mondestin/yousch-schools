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

/** Headcount per cycle, ready to plot as a donut. */
export function headcountByCycle(
    catalog: SchoolDataset,
    academicYearId: string,
): { cycle: Cycle; label: string; count: number; fill: string }[] {
    const rows = yearEnrollments(catalog, academicYearId);

    return catalog.cycles
        .map((cycle, index) => ({
            cycle: cycle.value,
            label: cycle.label,
            count: rows.filter(
                ({ classroom }) => classroom.cycle === cycle.value,
            ).length,
            fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .filter((row) => row.count > 0);
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

/** Daily presence rate, oldest first. */
export function attendanceTrend(
    catalog: SchoolDataset,
    academicYearId: string,
): { date: string; label: string; rate: number; absences: number }[] {
    const rows = yearEnrollments(catalog, academicYearId);
    const scoped = new Set(rows.map(({ enrollment }) => enrollment.id));

    return attendanceDates(catalog).map((date) => {
        const marks = catalog.attendance.filter(
            (mark) => mark.date === date && scoped.has(mark.enrollmentId),
        );
        const present = marks.filter(
            (mark) => mark.status === 'present' || mark.status === 'retard',
        ).length;

        return {
            date,
            label: new Intl.DateTimeFormat('fr-FR', {
                weekday: 'short',
                day: '2-digit',
            }).format(new Date(`${date}T00:00:00`)),
            rate:
                marks.length === 0
                    ? 0
                    : Math.round((present / marks.length) * 100),
            absences: marks.filter((mark) => mark.status === 'absent').length,
        };
    });
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
        retard: 'var(--warning)',
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
