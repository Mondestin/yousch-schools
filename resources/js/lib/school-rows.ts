import { CYCLE_LABELS, schoolDataset } from '@/mocks';
import type {
    AcademicYear,
    Cycle,
    CycleYearFilter,
    EnrollmentStatus,
    PaymentStatus,
    SchoolDataset,
    Term,
} from '@/types/school';

export type { CycleYearFilter };

export const COUNTRY_NAME = 'République du Congo';
export const COUNTRY_SHORT = 'Rép. du Congo';
export const COUNTRY_MOTTO = 'Unité * Travail * Progrès';
export const DEFAULT_CITY = 'Brazzaville';

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
    return new Map(items.map((item) => [item.id, item]));
}

export function formatFrDate(iso: string): string {
    const [year, month, day] = iso.slice(0, 10).split('-');

    if (!year || !month || !day) {
        return iso;
    }

    return `${day}/${month}/${year}`;
}

export function formatFcfa(amount: number): string {
    return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

export function formatFrDateTime(iso: string): string {
    const parsed = new Date(iso);

    if (Number.isNaN(parsed.getTime())) {
        return iso;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(parsed);
}

/**
 * Relative "last seen" wording, e.g. « il y a 3 h » or « il y a 12 j ».
 */
export function formatLastSeen(iso: string | null, now = new Date()): string {
    if (!iso) {
        return 'Jamais connecté';
    }

    const parsed = new Date(iso);

    if (Number.isNaN(parsed.getTime())) {
        return iso;
    }

    const minutes = Math.floor((now.getTime() - parsed.getTime()) / 60000);

    if (minutes < 2) {
        return 'À l’instant';
    }

    if (minutes < 60) {
        return `Il y a ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `Il y a ${hours} h`;
    }

    const days = Math.floor(hours / 24);

    if (days < 31) {
        return `Il y a ${days} j`;
    }

    return formatFrDate(iso);
}

/** Users seen in the last 15 minutes are shown as online. */
export function isOnline(iso: string | null, now = new Date()): boolean {
    if (!iso) {
        return false;
    }

    const parsed = new Date(iso);

    return (
        !Number.isNaN(parsed.getTime()) &&
        now.getTime() - parsed.getTime() < 15 * 60 * 1000
    );
}

export function personName(person: {
    firstName: string;
    lastName: string;
}): string {
    return `${person.firstName} ${person.lastName}`;
}

export function cycleLabel(cycle: Cycle): string {
    return CYCLE_LABELS[cycle];
}

export function cycleBadgeVariant(
    cycle: Cycle,
): 'rose' | 'blue' | 'teal' | 'purple' | 'amber' {
    const variants = {
        prescolaire: 'rose',
        primaire: 'blue',
        college: 'teal',
        lycee_general: 'purple',
        lycee_technique: 'amber',
    } as const satisfies Record<
        Cycle,
        'rose' | 'blue' | 'teal' | 'purple' | 'amber'
    >;

    return variants[cycle];
}

export function isLyceeCycle(
    cycle: Cycle,
): cycle is 'lycee_general' | 'lycee_technique' {
    return cycle === 'lycee_general' || cycle === 'lycee_technique';
}

export function enrollmentStatusVariant(
    status: EnrollmentStatus,
): 'success' | 'warning' | 'danger' {
    if (status === 'inscrit') {
        return 'success';
    }

    if (status === 'transfere') {
        return 'warning';
    }

    return 'danger';
}

export function enrollmentStatusLabel(status: EnrollmentStatus): string {
    if (status === 'inscrit') {
        return 'Inscrit';
    }

    if (status === 'transfere') {
        return 'Transféré';
    }

    return 'Abandonné';
}

export function paymentStatusLabel(status: PaymentStatus): string {
    if (status === 'paye') {
        return 'Payé';
    }

    if (status === 'partiel') {
        return 'Partiel';
    }

    return 'Impayé';
}

export function studentRows(
    catalog: SchoolDataset = schoolDataset,
    filter?: CycleYearFilter,
) {
    const classrooms = byId(catalog.classrooms);
    const tracks = byId(catalog.tracks);
    const students = byId(catalog.students);

    return catalog.enrollments
        .filter(
            (enrollment) =>
                !filter || enrollment.academicYearId === filter.academicYearId,
        )
        .map((enrollment) => {
            const student = students.get(enrollment.studentId);
            const classroom = classrooms.get(enrollment.classroomId);
            const track = enrollment.trackId
                ? tracks.get(enrollment.trackId)
                : undefined;

            return {
                id: enrollment.id,
                studentId: enrollment.studentId,
                matricule: student?.matricule ?? '—',
                name: student ? personName(student) : '—',
                firstName: student?.firstName ?? '',
                lastName: student?.lastName ?? '',
                classroomId: classroom?.id ?? '',
                classroom: classroom?.name ?? '—',
                cycle: classroom?.cycle ?? 'primaire',
                cycleName: classroom ? cycleLabel(classroom.cycle) : '—',
                track: track?.code ?? null,
                status: enrollment.status,
                enrolledOn: student?.enrolledOn ?? '',
                photoUrl: student?.photoUrl ?? null,
                academicYearId: enrollment.academicYearId,
            };
        })
        .filter((row) => !filter || row.cycle === filter.cycle);
}

export function guardianRows(
    catalog: SchoolDataset = schoolDataset,
    filter?: CycleYearFilter,
) {
    const students = byId(catalog.students);
    const inScope = new Set(
        studentRows(catalog, filter).map((row) => row.studentId),
    );

    return catalog.guardians
        .map((guardian) => {
            const children = catalog.studentGuardians
                .filter((link) => link.guardianId === guardian.id)
                .map((link) => link.studentId)
                .filter((studentId) => !filter || inScope.has(studentId))
                .map((studentId) => students.get(studentId))
                .filter(Boolean)
                .map((student) => personName(student!));

            return {
                ...guardian,
                name: personName(guardian),
                childrenCount: children.length,
                children,
            };
        })
        .filter((guardian) => !filter || guardian.childrenCount > 0);
}

export function paymentRows(
    catalog: SchoolDataset = schoolDataset,
    filter?: CycleYearFilter,
) {
    const enrollments = byId(catalog.enrollments);
    const students = byId(catalog.students);
    const classrooms = byId(catalog.classrooms);

    return catalog.payments
        .map((payment) => {
            const enrollment = enrollments.get(payment.enrollmentId);
            const student = enrollment
                ? students.get(enrollment.studentId)
                : undefined;
            const classroom = enrollment
                ? classrooms.get(enrollment.classroomId)
                : undefined;

            return {
                ...payment,
                studentId: enrollment?.studentId ?? '',
                studentName: student ? personName(student) : '—',
                lastName: student?.lastName ?? '',
                firstName: student?.firstName ?? '',
                matricule: student?.matricule ?? '—',
                classroomId: classroom?.id ?? '',
                classroom: classroom?.name ?? '—',
                cycle: classroom?.cycle ?? 'primaire',
                academicYearId: enrollment?.academicYearId ?? '',
                photoUrl: student?.photoUrl ?? null,
                method: payment.method ?? null,
            };
        })
        .filter(
            (row) =>
                !filter ||
                (row.cycle === filter.cycle &&
                    row.academicYearId === filter.academicYearId),
        );
}

export function assessmentRows(
    catalog: SchoolDataset = schoolDataset,
    filter?: CycleYearFilter,
) {
    const classrooms = byId(catalog.classrooms);
    const subjects = byId(catalog.subjects);
    const terms = byId(catalog.terms);

    return catalog.assessments
        .map((assessment) => {
            const classroom = classrooms.get(assessment.classroomId);
            const term = terms.get(assessment.termId);

            return {
                ...assessment,
                classroom: classroom?.name ?? '—',
                cycle: classroom?.cycle ?? 'primaire',
                subject: subjects.get(assessment.subjectId)?.name ?? '—',
                term: term?.name ?? '—',
                academicYearId: term?.academicYearId ?? '',
            };
        })
        .filter(
            (row) =>
                !filter ||
                (row.cycle === filter.cycle &&
                    row.academicYearId === filter.academicYearId),
        );
}

export function formatHeldRange(heldAt: string, heldUntil: string): string {
    return `${heldAt} – ${heldUntil}`;
}

export function todayIso(now = new Date()): string {
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function formatFrMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-');

    if (!year || !month) {
        return yearMonth;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(Number(year), Number(month) - 1, 1));
}

export function academicMonth(year: AcademicYear, today = todayIso()): string {
    if (today < year.startsOn) {
        return year.startsOn.slice(0, 7);
    }

    if (today > year.endsOn) {
        return year.endsOn.slice(0, 7);
    }

    return today.slice(0, 7);
}

export function currentTermForYear(
    catalog: SchoolDataset,
    academicYearId: string,
    today = todayIso(),
): Term | null {
    const terms = catalog.terms
        .filter((term) => term.academicYearId === academicYearId)
        .sort((left, right) => left.position - right.position);

    if (terms.length === 0) {
        return null;
    }

    return (
        terms.find((term) => term.startsOn <= today && today <= term.endsOn) ??
        (today < terms[0].startsOn ? terms[0] : terms[terms.length - 1])
    );
}

export function effectifsByCycle(
    catalog: SchoolDataset,
    academicYearId: string,
) {
    const rows = studentRows(catalog).filter(
        (row) =>
            row.academicYearId === academicYearId && row.status === 'inscrit',
    );

    return catalog.cycles.map((cycle) => ({
        cycle: cycle.value,
        label: cycle.label,
        count: rows.filter((row) => row.cycle === cycle.value).length,
    }));
}

export function dashboardSnapshot(
    catalog: SchoolDataset,
    filter: CycleYearFilter,
    today = todayIso(),
) {
    const year = catalog.academicYears.find(
        (item) => item.id === filter.academicYearId,
    );
    const month = year ? academicMonth(year, today) : today.slice(0, 7);
    const term = currentTermForYear(catalog, filter.academicYearId, today);
    const effectifs = effectifsByCycle(catalog, filter.academicYearId);
    const scopedStudents = studentRows(catalog, filter);
    const monthPayments = paymentRows(catalog, filter).filter(
        (payment) => payment.month === month,
    );
    const unpaidMonth = monthPayments.filter(
        (payment) => payment.status !== 'paye',
    );
    const cycleAssessments = assessmentRows(catalog, filter);
    const compositions = cycleAssessments.filter(
        (assessment) =>
            assessment.type === 'composition' &&
            (term === null || assessment.termId === term.id),
    );

    return {
        effectifs,
        effectifsTotal: effectifs.reduce((sum, item) => sum + item.count, 0),
        cycleStudents: scopedStudents.filter((row) => row.status === 'inscrit')
            .length,
        teachers: catalog.teachers.filter(
            (teacher) => teacher.status === 'actif',
        ).length,
        month,
        monthLabel: formatFrMonth(month),
        unpaidMonthTotal: unpaidMonth.reduce(
            (sum, payment) => sum + (payment.expectedAmount - payment.amount),
            0,
        ),
        unpaidMonthCount: unpaidMonth.length,
        term,
        compositions: compositions.length,
        recentEnrollments: [...scopedStudents]
            .sort(
                (left, right) =>
                    right.enrolledOn.localeCompare(left.enrolledOn) ||
                    right.id.localeCompare(left.id),
            )
            .slice(0, 5),
        recentPayments: [...paymentRows(catalog, filter)]
            .sort(
                (left, right) =>
                    (right.paidOn ?? right.month).localeCompare(
                        left.paidOn ?? left.month,
                    ) || right.id.localeCompare(left.id),
            )
            .slice(0, 5),
        upcomingCompositions: cycleAssessments
            .filter(
                (assessment) =>
                    assessment.type === 'composition' &&
                    assessment.heldOn >= today,
            )
            .sort((left, right) => left.heldOn.localeCompare(right.heldOn))
            .slice(0, 5),
    };
}
