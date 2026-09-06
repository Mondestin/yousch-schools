import { cycleLabel, isLyceeCycle, personName } from '@/lib/school-rows';
import type {
    Cycle,
    CycleYearFilter,
    SchoolDataset,
    StaffRole,
    Teacher,
} from '@/types/school';

export const MARITAL_STATUSES = [
    'célibataire',
    'marié',
    'mariée',
    'divorcé',
    'veuf',
    'veuve',
] as const;

export function teacherStatusLabel(status: Teacher['status']): string {
    return status === 'actif' ? 'Actif' : 'Inactif';
}

export function staffRoleLabel(
    role: StaffRole,
    roles: SchoolDataset['roles'],
): string {
    return roles.find((item) => item.value === role)?.label ?? role;
}

export function staffRoleBadgeVariant(
    role: StaffRole,
): 'purple' | 'blue' | 'amber' | 'teal' {
    if (role === 'admin') {
        return 'purple';
    }

    if (role === 'directeur') {
        return 'blue';
    }

    if (role === 'secretaire') {
        return 'amber';
    }

    return 'teal';
}

export function staffCycleSummary(
    cycles: Cycle[],
    options: SchoolDataset['cycles'],
): string {
    if (cycles.length === 0) {
        return 'Aucun';
    }

    if (cycles.length === options.length) {
        return 'Tous les cycles';
    }

    return options
        .filter((item) => cycles.includes(item.value))
        .map((item) => item.label)
        .join(', ');
}

export function needsCoefficient(cycle: Cycle): boolean {
    return (
        cycle === 'college' ||
        cycle === 'lycee_general' ||
        cycle === 'lycee_technique'
    );
}

export function nextTeacherCode(catalog: SchoolDataset): string {
    const numbers = catalog.teachers
        .map((teacher) => teacher.code)
        .filter((code) => code.startsWith('ENS-'))
        .map((code) => Number(code.slice(4)))
        .filter((value) => Number.isFinite(value));
    const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;

    return `ENS-${String(next).padStart(3, '0')}`;
}

export function teacherRows(catalog: SchoolDataset, filter?: CycleYearFilter) {
    const classrooms = new Map(
        catalog.classrooms.map((classroom) => [classroom.id, classroom]),
    );

    return catalog.teachers
        .map((teacher) => {
            const assignments = catalog.teacherAssignments.filter(
                (item) =>
                    item.teacherId === teacher.id &&
                    (!filter || item.academicYearId === filter.academicYearId),
            );
            const cycles = [
                ...new Set(
                    assignments
                        .map(
                            (item) =>
                                classrooms.get(item.classroomId)?.cycle ?? null,
                        )
                        .filter((cycle): cycle is Cycle => cycle !== null),
                ),
            ];

            return {
                ...teacher,
                name: personName(teacher),
                cycles,
                assignmentCount: assignments.length,
            };
        })
        .filter((teacher) => {
            if (!filter) {
                return true;
            }

            return (
                teacher.assignmentCount === 0 ||
                teacher.cycles.includes(filter.cycle)
            );
        });
}

export function teacherFiche(
    catalog: SchoolDataset,
    teacherId: string,
    academicYearId?: string,
) {
    const teacher = catalog.teachers.find((item) => item.id === teacherId);

    if (!teacher) {
        return null;
    }

    const classrooms = new Map(
        catalog.classrooms.map((classroom) => [classroom.id, classroom]),
    );
    const subjects = new Map(
        catalog.subjects.map((subject) => [subject.id, subject]),
    );
    const years = new Map(catalog.academicYears.map((year) => [year.id, year]));
    const tracks = new Map(catalog.tracks.map((track) => [track.id, track]));
    const assignments = catalog.teacherAssignments
        .filter(
            (item) =>
                item.teacherId === teacherId &&
                (!academicYearId || item.academicYearId === academicYearId),
        )
        .map((item) => {
            const classroom = classrooms.get(item.classroomId);
            const subject = subjects.get(item.subjectId);
            const year = years.get(item.academicYearId);
            const track = item.trackId
                ? tracks.get(item.trackId)
                : classroom?.trackId
                  ? tracks.get(classroom.trackId)
                  : undefined;

            return {
                ...item,
                classroom: classroom?.name ?? '-',
                cycle: classroom?.cycle ?? null,
                cycleName: classroom ? cycleLabel(classroom.cycle) : '-',
                subject: subject?.name ?? '-',
                subjectCode: subject?.code ?? '-',
                yearLabel: year?.label ?? '-',
                trackCode: track?.code ?? null,
                lycee: classroom ? isLyceeCycle(classroom.cycle) : false,
            };
        });

    return {
        teacher,
        name: personName(teacher),
        assignments,
    };
}

export type TeacherFiche = NonNullable<ReturnType<typeof teacherFiche>>;
