import { DEFAULT_CYCLE, SCHOOL_CYCLES } from '@/mocks';
import type { Cycle, SchoolContext } from '@/types/school';

export { DEFAULT_CYCLE, SCHOOL_CYCLES };

export function anneeQueryFromLabel(label: string): string {
    return label.replaceAll(/[–—]/g, '-');
}

export function isSchoolCycle(value: string): value is Cycle {
    return SCHOOL_CYCLES.some((cycle) => cycle.value === value);
}

export function contextQuery(
    context: Pick<
        SchoolContext,
        'cycle' | 'annee' | 'staffRole' | 'rolePreview'
    >,
): {
    cycle: Cycle;
    annee: string;
    role?: SchoolContext['staffRole'];
} {
    return {
        cycle: context.cycle,
        annee: context.annee,
        ...(context.rolePreview ? { role: context.staffRole } : {}),
    };
}
