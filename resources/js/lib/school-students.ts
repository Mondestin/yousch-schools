import { cycleLabel, formatFrDate, personName, todayIso } from '@/lib/school-rows';
import type {
    AssessmentType,
    AttendanceStatus,
    Gender,
    GuardianRelation,
    SchoolDataset,
} from '@/types/school';

export function genderLabel(gender: Gender | null | undefined): string {
    if (gender === 'femme') {
        return 'Féminin';
    }

    if (gender === 'homme') {
        return 'Masculin';
    }

    return '-';
}

export const GUARDIAN_RELATIONS: GuardianRelation[] = [
    'pere',
    'mere',
    'tuteur',
    'oncle',
    'tante',
    'autre',
];

export function guardianRelationLabel(relation: GuardianRelation): string {
    if (relation === 'pere') {
        return 'Père';
    }

    if (relation === 'mere') {
        return 'Mère';
    }

    if (relation === 'tuteur') {
        return 'Tuteur';
    }

    if (relation === 'oncle') {
        return 'Oncle';
    }

    if (relation === 'tante') {
        return 'Tante';
    }

    return 'Autre';
}

export function assessmentTypeLabel(type: AssessmentType): string {
    if (type === 'devoir') {
        return 'Devoir';
    }

    if (type === 'composition') {
        return 'Composition';
    }

    return 'Examen';
}

export function assessmentTypeBadgeVariant(
    type: AssessmentType,
): 'blue' | 'purple' | 'amber' {
    if (type === 'devoir') {
        return 'blue';
    }

    if (type === 'composition') {
        return 'purple';
    }

    return 'amber';
}

export function nextMatricule(
    catalog: SchoolDataset,
    yearQuery: string,
): string {
    const prefix = `YS-${yearQuery.slice(0, 4)}-`;
    const numbers = catalog.students
        .map((student) => student.matricule)
        .filter((matricule) => matricule.startsWith(prefix))
        .map((matricule) => Number(matricule.slice(prefix.length)))
        .filter((value) => Number.isFinite(value));
    const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;

    return `${prefix}${String(next).padStart(5, '0')}`;
}

export function mentionForScore(
    catalog: SchoolDataset,
    score: number,
): string | null {
    return (
        catalog.mentions.find(
            (mention) => score >= mention.min && score <= mention.max,
        )?.label ?? null
    );
}

export function studentFiche(
    catalog: SchoolDataset,
    studentId: string,
    academicYearId?: string,
) {
    const student = catalog.students.find((item) => item.id === studentId);

    if (!student) {
        return null;
    }

    const enrollments = catalog.enrollments.filter(
        (item) => item.studentId === studentId,
    );
    const enrollment =
        enrollments.find((item) => item.academicYearId === academicYearId) ??
        enrollments[0] ??
        null;
    const classroom = enrollment
        ? (catalog.classrooms.find(
              (item) => item.id === enrollment.classroomId,
          ) ?? null)
        : null;
    const year = enrollment
        ? (catalog.academicYears.find(
              (item) => item.id === enrollment.academicYearId,
          ) ?? null)
        : null;
    const track = enrollment?.trackId
        ? (catalog.tracks.find((item) => item.id === enrollment.trackId) ??
          null)
        : null;
    const guardians = catalog.studentGuardians
        .filter((link) => link.studentId === studentId)
        .map((link) => {
            const guardian = catalog.guardians.find(
                (item) => item.id === link.guardianId,
            );

            if (!guardian) {
                return null;
            }

            return {
                ...guardian,
                name: personName(guardian),
                relation: link.relation,
            };
        })
        .filter((item) => item !== null);
    const subjects = new Map(
        catalog.subjects.map((subject) => [subject.id, subject]),
    );
    const assessments = new Map(
        catalog.assessments.map((assessment) => [assessment.id, assessment]),
    );
    const grades = catalog.grades
        .filter(
            (grade) =>
                enrollment !== null && grade.enrollmentId === enrollment.id,
        )
        .map((grade) => {
            const assessment = assessments.get(grade.assessmentId);
            const subject = subjects.get(grade.subjectId);

            return {
                ...grade,
                subject: subject?.name ?? '-',
                assessment: assessment?.name ?? '-',
                type: assessment?.type ?? 'devoir',
                heldOn: assessment?.heldOn ?? '',
                mention: mentionForScore(catalog, grade.score),
            };
        })
        .sort((left, right) => left.heldOn.localeCompare(right.heldOn));
    const payments = catalog.payments
        .filter(
            (payment) =>
                enrollment !== null && payment.enrollmentId === enrollment.id,
        )
        .sort((left, right) => left.month.localeCompare(right.month));

    return {
        student,
        enrollment,
        classroom,
        year,
        track,
        name: personName(student),
        classroomName: classroom?.name ?? '-',
        cycle: classroom?.cycle ?? null,
        cycleName: classroom ? cycleLabel(classroom.cycle) : '-',
        yearLabel: year?.label ?? '-',
        trackCode: track?.code ?? null,
        enrolledOnLabel: formatFrDate(student.enrolledOn),
        bornOnLabel: formatFrDate(student.bornOn),
        guardians,
        grades,
        payments,
        sanctions: catalog.sanctions.filter(
            (item) => item.studentId === studentId,
        ),
        profile: catalog.profile,
    };
}

/** Presence summary for one enrollment (used on student overview). */
export function studentAttendanceSummary(
    catalog: SchoolDataset,
    enrollmentId: string | null | undefined,
) {
    const marks = enrollmentId
        ? catalog.attendance.filter(
              (mark) => mark.enrollmentId === enrollmentId,
          )
        : [];
    const present = marks.filter(
        (mark) => mark.status === 'present' || mark.status === 'retard',
    ).length;
    const absent = marks.filter((mark) => mark.status === 'absent').length;
    const retard = marks.filter((mark) => mark.status === 'retard').length;
    const excuse = marks.filter((mark) => mark.status === 'excuse').length;
    const recent = [...marks]
        .sort((left, right) => right.date.localeCompare(left.date))
        .slice(0, 8);

    return {
        total: marks.length,
        present,
        absent,
        retard,
        excuse,
        rate:
            marks.length === 0
                ? null
                : Math.round((present / marks.length) * 100),
        recent,
        fortnight: studentAttendanceFortnight(marks),
    };
}

/** Daily attendance stack for the last 14 calendar days (oldest first). */
export function studentAttendanceFortnight(
    marks: Array<{ date: string; status: AttendanceStatus }>,
    days = 14,
    today = todayIso(),
) {
    const [year, month, day] = today.split('-').map(Number);
    const end = new Date(year, month - 1, day);
    const byDate = new Map<string, typeof marks>();

    for (const mark of marks) {
        const bucket = byDate.get(mark.date);

        if (bucket) {
            bucket.push(mark);
        } else {
            byDate.set(mark.date, [mark]);
        }
    }

    const series: Array<{
        date: string;
        label: string;
        present: number;
        retard: number;
        excuse: number;
        absent: number;
        total: number;
    }> = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const cursor = new Date(end);
        cursor.setDate(end.getDate() - offset);
        const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const dayMarks = byDate.get(iso) ?? [];

        series.push({
            date: iso,
            label: new Intl.DateTimeFormat('fr-FR', {
                weekday: 'short',
                day: '2-digit',
            }).format(cursor),
            present: dayMarks.filter((mark) => mark.status === 'present')
                .length,
            retard: dayMarks.filter((mark) => mark.status === 'retard').length,
            excuse: dayMarks.filter((mark) => mark.status === 'excuse').length,
            absent: dayMarks.filter((mark) => mark.status === 'absent').length,
            total: dayMarks.length,
        });
    }

    return series;
}

export function studentAverageScore(
    grades: Array<{ score: number }>,
): number | null {
    if (grades.length === 0) {
        return null;
    }

    const total = grades.reduce((sum, grade) => sum + grade.score, 0);

    return Math.round((total / grades.length) * 10) / 10;
}

export type StudentFiche = NonNullable<ReturnType<typeof studentFiche>>;

export function guardianFiche(catalog: SchoolDataset, guardianId: string) {
    const guardian = catalog.guardians.find((item) => item.id === guardianId);

    if (!guardian) {
        return null;
    }

    const classrooms = new Map(
        catalog.classrooms.map((classroom) => [classroom.id, classroom]),
    );
    const enrollments = catalog.enrollments;
    const children = catalog.studentGuardians
        .filter((link) => link.guardianId === guardianId)
        .map((link) => {
            const student = catalog.students.find(
                (item) => item.id === link.studentId,
            );

            if (!student) {
                return null;
            }

            const enrollment = enrollments.find(
                (item) => item.studentId === student.id,
            );
            const classroom = enrollment
                ? (classrooms.get(enrollment.classroomId) ?? null)
                : null;

            return {
                studentId: student.id,
                name: personName(student),
                lastName: student.lastName,
                firstName: student.firstName,
                matricule: student.matricule,
                classroom: classroom?.name ?? '-',
                cycle: classroom?.cycle ?? null,
                cycleName: classroom ? cycleLabel(classroom.cycle) : '-',
                relation: link.relation,
            };
        })
        .filter((item) => item !== null);

    return {
        guardian,
        name: personName(guardian),
        children,
        childrenCount: children.length,
    };
}

export type GuardianFiche = NonNullable<ReturnType<typeof guardianFiche>>;
