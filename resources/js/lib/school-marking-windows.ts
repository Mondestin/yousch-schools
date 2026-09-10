import type {
    AssessmentType,
    MarkingWindow,
    SchoolDataset,
} from '@/types/school';

export function windowFor(
    catalog: Pick<SchoolDataset, 'markingWindows'>,
    termId: string,
    type: AssessmentType,
): MarkingWindow | null {
    return (
        (catalog.markingWindows ?? []).find(
            (window) => window.termId === termId && window.type === type,
        ) ?? null
    );
}

/**
 * Mirrors MarkingWindowGate::assertCanEnterGrades (non-privileged path).
 * Privileged users always may enter.
 */
export function canEnterGrades(
    window: MarkingWindow | null | undefined,
    type: AssessmentType,
    isPrivileged: boolean,
    today: string,
): boolean {
    if (isPrivileged) {
        return true;
    }

    if (type === 'composition' || type === 'examen') {
        if (window == null) {
            return false;
        }

        if (window.closedAt !== null) {
            return false;
        }

        return today >= window.opensOn && today <= window.closesOn;
    }

    // Devoir: free unless a window exists.
    if (window == null) {
        return true;
    }

    if (window.closedAt !== null) {
        return false;
    }

    return today >= window.opensOn && today <= window.closesOn;
}

export function gradesBlockedHint(
    window: MarkingWindow | null | undefined,
    type: AssessmentType,
    isPrivileged: boolean,
    today: string,
): string | null {
    if (canEnterGrades(window, type, isPrivileged, today)) {
        return null;
    }

    if (type === 'composition' || type === 'examen') {
        if (window == null) {
            return 'La période de saisie pour cette évaluation n’est pas encore ouverte.';
        }
    }

    if (window == null) {
        return null;
    }

    if (window.closedAt !== null) {
        return 'La saisie des notes est clôturée pour cette section.';
    }

    return 'La saisie des notes n’est autorisée que pendant la période définie.';
}

/** Devoir + composition windows must both be formally closed. */
export function bulletinsReady(
    catalog: Pick<SchoolDataset, 'markingWindows'>,
    termId: string,
): boolean {
    const devoir = windowFor(catalog, termId, 'devoir');
    const composition = windowFor(catalog, termId, 'composition');

    return devoir?.closedAt != null && composition?.closedAt != null;
}

export const BULLETINS_NOT_READY_MESSAGE =
    'Les sections de saisie doivent être clôturées par l’administration.';

export type MarkingWindowStatus =
    | 'ouverte'
    | 'fermee'
    | 'hors_periode'
    | 'cloturee';

export function markingWindowStatus(
    window: Pick<MarkingWindow, 'opensOn' | 'closesOn' | 'closedAt'>,
    today: string,
): MarkingWindowStatus {
    if (window.closedAt !== null) {
        return 'cloturee';
    }

    if (today < window.opensOn) {
        return 'hors_periode';
    }

    if (today > window.closesOn) {
        return 'fermee';
    }

    return 'ouverte';
}

export function markingWindowStatusLabel(status: MarkingWindowStatus): string {
    switch (status) {
        case 'ouverte':
            return 'Ouverte';
        case 'fermee':
            return 'Fermée';
        case 'hors_periode':
            return 'Hors période';
        case 'cloturee':
            return 'Clôturée';
    }
}
