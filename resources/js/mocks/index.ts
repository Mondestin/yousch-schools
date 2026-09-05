import catalog from '@/mocks/school.json';
import type { Cycle, SchoolDataset } from '@/types/school';

export const schoolDataset = catalog as SchoolDataset;

export const CYCLE_LABELS: Record<Cycle, string> = {
    prescolaire: 'Préscolaire',
    primaire: 'Primaire',
    college: 'Collège',
    lycee_general: 'Lycée Général',
    lycee_technique: 'Lycée Technique',
};

export const SCHOOL_CYCLES = schoolDataset.cycles;
export const ACADEMIC_YEARS = schoolDataset.academicYears.map(
    (year) => year.label,
);
export const CURRENT_ACADEMIC_YEAR =
    schoolDataset.academicYears.find((year) => year.isCurrent)?.label ??
    '2026–2027';
export const DEFAULT_CYCLE: Cycle = 'primaire';
