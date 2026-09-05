import {
    cycleLabel,
    formatFcfa,
    formatFrMonth,
    personName,
    studentRows,
    todayIso,
} from '@/lib/school-rows';
import type {
    AcademicYear,
    Cycle,
    CycleYearFilter,
    Payment,
    PaymentStatus,
    SchoolDataset,
} from '@/types/school';

export function paymentStatusFromAmount(
    amount: number,
    expectedAmount: number,
): PaymentStatus {
    if (amount <= 0) {
        return 'impaye';
    }

    if (amount >= expectedAmount) {
        return 'paye';
    }

    return 'partiel';
}

export function expectedFee(catalog: SchoolDataset, cycle: Cycle): number {
    return catalog.fees.find((fee) => fee.cycle === cycle)?.monthlyAmount ?? 0;
}

/** Scolarité annuelle = 12 mensualités, même si le calendrier scolaire est plus court. */
export const ANNUAL_FEE_MONTHS = 12;

export function annualFee(monthlyAmount: number): number {
    return monthlyAmount * ANNUAL_FEE_MONTHS;
}

export function enrollmentPaidTotal(
    payments: Payment[],
    enrollmentId: string,
): number {
    return payments
        .filter((payment) => payment.enrollmentId === enrollmentId)
        .reduce((sum, payment) => sum + payment.amount, 0);
}

export function paymentAccount(
    payments: Payment[],
    enrollmentId: string,
    month: string,
    monthlyAmount: number,
): {
    paidYear: number;
    remainingYear: number;
    paidMonth: number;
    remainingMonth: number;
    annual: number;
} {
    const annual = annualFee(monthlyAmount);
    const paidYear = enrollmentPaidTotal(payments, enrollmentId);
    const paidMonth =
        payments.find(
            (payment) =>
                payment.enrollmentId === enrollmentId &&
                payment.month === month,
        )?.amount ?? 0;

    return {
        paidYear,
        remainingYear: Math.max(0, annual - paidYear),
        paidMonth,
        remainingMonth: Math.max(0, monthlyAmount - paidMonth),
        annual,
    };
}

export type ApplyCashResult =
    | { ok: true; payments: Payment[] }
    | { ok: false; error: string };

/**
 * Impute un encaissement à partir d’un mois : d’abord le reste du mois choisi,
 * puis les mois suivants encore ouverts, sans dépasser le plafond annuel (12 × mensualité).
 */
export function applyCashToYear(input: {
    payments: Payment[];
    enrollmentId: string;
    startMonth: string;
    cash: number;
    monthlyAmount: number;
    months: string[];
    paidOn: string;
    method: Payment['method'];
}): ApplyCashResult {
    const {
        payments,
        enrollmentId,
        startMonth,
        cash,
        monthlyAmount,
        months,
        paidOn,
        method,
    } = input;

    if (cash <= 0) {
        return { ok: false, error: 'Le montant doit être supérieur à 0.' };
    }

    const startIndex = months.indexOf(startMonth);

    if (startIndex < 0) {
        return { ok: false, error: 'Mois de facturation introuvable.' };
    }

    const paidYear = enrollmentPaidTotal(payments, enrollmentId);
    const annual = annualFee(monthlyAmount);

    if (paidYear + cash > annual) {
        const room = Math.max(0, annual - paidYear);

        return {
            ok: false,
            error:
                room <= 0
                    ? 'Les 12 mensualités de l’année sont déjà soldées.'
                    : `Le plafond annuel est ${formatFcfa(annual)}. Il reste ${formatFcfa(room)} à encaisser.`,
        };
    }

    const next = payments.map((payment) => ({ ...payment }));
    let leftover = cash;

    for (
        let index = startIndex;
        index < months.length && leftover > 0;
        index += 1
    ) {
        const month = months[index];
        const current =
            next.find(
                (payment) =>
                    payment.enrollmentId === enrollmentId &&
                    payment.month === month,
            ) ?? null;
        const already = current?.amount ?? 0;
        const room = Math.max(0, monthlyAmount - already);

        if (room <= 0) {
            continue;
        }

        const add = Math.min(leftover, room);
        const amount = already + add;
        const status = paymentStatusFromAmount(amount, monthlyAmount);
        const row: Payment = {
            id: current?.id ?? `py-local-${enrollmentId}-${month}`,
            enrollmentId,
            month,
            amount,
            expectedAmount: monthlyAmount,
            status,
            paidOn: amount > 0 ? paidOn : null,
            method: amount > 0 ? method : null,
        };

        if (current) {
            const at = next.findIndex((payment) => payment.id === current.id);
            next[at] = row;
        } else {
            next.push(row);
        }

        leftover -= add;
    }

    if (leftover > 0) {
        return {
            ok: false,
            error: `Impossible d’imputer ${formatFcfa(leftover)} : les mois suivants sont déjà soldés. Choisissez un mois antérieur ou un montant plus bas.`,
        };
    }

    return { ok: true, payments: next };
}

/** Last calendar day of a billing month (`YYYY-MM`). */
export function monthDueOn(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const last = new Date(year, monthNum, 0);
    const day = String(last.getDate()).padStart(2, '0');

    return `${year}-${String(monthNum).padStart(2, '0')}-${day}`;
}

export function isFeeOverdue(
    month: string,
    status: PaymentStatus,
    today = todayIso(),
): boolean {
    return status !== 'paye' && today > monthDueOn(month);
}

export type FeeLedgerRow = Payment & {
    studentId: string;
    studentName: string;
    lastName: string;
    firstName: string;
    matricule: string;
    photoUrl: string | null;
    classroomId: string;
    classroom: string;
    cycle: Cycle;
    academicYearId: string;
    dueOn: string;
    overdue: boolean;
    /** True when the dossier exists only as a monthly due, not yet posted. */
    draft: boolean;
};

export function feeStats(
    rows: Pick<Payment, 'amount' | 'expectedAmount' | 'status'>[],
) {
    const expected = rows.reduce((sum, row) => sum + row.expectedAmount, 0);
    const collected = rows.reduce((sum, row) => sum + row.amount, 0);
    const outstanding = Math.max(expected - collected, 0);
    const paid = rows.filter((row) => row.status === 'paye').length;
    const partial = rows.filter((row) => row.status === 'partiel').length;
    const unpaid = rows.filter((row) => row.status === 'impaye').length;

    return {
        expected,
        collected,
        outstanding,
        paid,
        partial,
        unpaid,
        dossiers: rows.length,
        rate: expected === 0 ? 0 : Math.round((collected / expected) * 100),
    };
}

/**
 * One line per enrolled student for a billing month. Missing postings
 * appear as unpaid drafts so the till shows the full class roll.
 */
export function feeLedgerRows(
    catalog: SchoolDataset,
    filter: CycleYearFilter,
    month: string,
): FeeLedgerRow[] {
    const posted = new Map(
        catalog.payments
            .filter((payment) => payment.month === month)
            .map((payment) => [payment.enrollmentId, payment]),
    );

    return studentRows(catalog, filter)
        .filter((row) => row.status === 'inscrit')
        .map((row) => {
            const expectedAmount = expectedFee(catalog, row.cycle);
            const payment = posted.get(row.id);
            const amount = payment?.amount ?? 0;
            const status = payment
                ? payment.status
                : paymentStatusFromAmount(0, expectedAmount);
            const dueOn = monthDueOn(month);

            return {
                id: payment?.id ?? `due-${row.id}-${month}`,
                enrollmentId: row.id,
                month,
                amount,
                expectedAmount: payment?.expectedAmount ?? expectedAmount,
                status,
                paidOn: payment?.paidOn ?? null,
                method: payment?.method ?? null,
                studentId: row.studentId,
                studentName: row.name,
                lastName: row.lastName,
                firstName: row.firstName,
                matricule: row.matricule,
                photoUrl: row.photoUrl,
                classroomId: row.classroomId,
                classroom: row.classroom,
                cycle: row.cycle,
                academicYearId: row.academicYearId,
                dueOn,
                overdue: isFeeOverdue(month, status),
                draft: payment === undefined,
            };
        })
        .sort(
            (left, right) =>
                left.classroom.localeCompare(right.classroom, 'fr') ||
                left.lastName.localeCompare(right.lastName, 'fr') ||
                left.firstName.localeCompare(right.firstName, 'fr'),
        );
}

/** 12 mois de facturation à partir de la rentrée (`startsOn`). */
export function academicYearMonths(year: AcademicYear): string[] {
    const months: string[] = [];
    const start = new Date(`${year.startsOn}T00:00:00`);

    for (let offset = 0; offset < ANNUAL_FEE_MONTHS; offset += 1) {
        const cursor = new Date(
            start.getFullYear(),
            start.getMonth() + offset,
            1,
        );
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        months.push(`${y}-${m}`);
    }

    return months;
}

export function receiptFiche(
    catalog: SchoolDataset,
    studentId: string,
    academicYearId: string,
) {
    const student = catalog.students.find((item) => item.id === studentId);

    if (!student) {
        return null;
    }

    const enrollment =
        catalog.enrollments.find(
            (item) =>
                item.studentId === studentId &&
                item.academicYearId === academicYearId,
        ) ??
        catalog.enrollments.find((item) => item.studentId === studentId) ??
        null;

    if (!enrollment) {
        return null;
    }

    const classroom =
        catalog.classrooms.find((item) => item.id === enrollment.classroomId) ??
        null;
    const year =
        catalog.academicYears.find(
            (item) => item.id === enrollment.academicYearId,
        ) ?? null;
    const track = enrollment.trackId
        ? (catalog.tracks.find((item) => item.id === enrollment.trackId) ??
          null)
        : null;
    const monthly = classroom ? expectedFee(catalog, classroom.cycle) : 0;
    const months = year ? academicYearMonths(year) : [];
    const posted = new Map(
        catalog.payments
            .filter((payment) => payment.enrollmentId === enrollment.id)
            .map((payment) => [payment.month, payment]),
    );
    const lines = months.map((month) => {
        const payment = posted.get(month);
        const amount = payment?.amount ?? 0;
        const expectedAmount = payment?.expectedAmount ?? monthly;
        const status = payment
            ? payment.status
            : paymentStatusFromAmount(0, expectedAmount);

        return {
            id: payment?.id ?? `due-${enrollment.id}-${month}`,
            enrollmentId: enrollment.id,
            month,
            amount,
            expectedAmount,
            remaining: Math.max(0, expectedAmount - amount),
            status,
            paidOn: payment?.paidOn ?? null,
            method: payment?.method ?? null,
            monthLabel: formatFrMonth(month),
            posted: payment !== undefined,
        };
    });
    const expectedTotal = annualFee(monthly);
    const paidTotal = enrollmentPaidTotal(catalog.payments, enrollment.id);

    return {
        student,
        enrollment,
        classroom,
        year,
        track,
        name: personName(student),
        classroomName: classroom?.name ?? '—',
        cycleName: classroom ? cycleLabel(classroom.cycle) : '—',
        yearLabel: year?.label ?? '—',
        trackCode: track?.code ?? null,
        lines,
        expectedTotal,
        paidTotal,
        unpaidTotal: Math.max(0, expectedTotal - paidTotal),
        profile: catalog.profile,
        issuedOn: new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date()),
    };
}

export type ReceiptFiche = NonNullable<ReturnType<typeof receiptFiche>>;

export function paymentSlip(
    catalog: SchoolDataset,
    studentId: string,
    paymentId: string,
    academicYearId: string,
) {
    const fiche = receiptFiche(catalog, studentId, academicYearId);
    const payment = fiche?.lines.find((line) => line.id === paymentId) ?? null;

    if (!fiche || !payment) {
        return null;
    }

    return { ...fiche, payment };
}
