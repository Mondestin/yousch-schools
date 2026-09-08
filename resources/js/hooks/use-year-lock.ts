import { useSchoolContext } from '@/hooks/use-school-context';

/**
 * Year lock: when the switcher is not on the année en cours, data is consultation-only.
 */
export function useYearLock(options?: { allowWhenReadOnly?: boolean }) {
    const { readOnly, isCurrentYear, academicYearLabel, annee } =
        useSchoolContext();
    const locked = readOnly && !options?.allowWhenReadOnly;

    return {
        locked,
        readOnly: locked,
        isCurrentYear,
        academicYearLabel,
        annee,
        canMutate: !locked,
        lockHint: locked
            ? `Consultation seule · ${academicYearLabel}. Passez à l’année en cours pour modifier.`
            : null,
    };
}
