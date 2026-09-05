import type { AcademicYear, Term, VenueKind } from '@/types/school';

const VENUE_KIND_LABELS: Record<VenueKind, string> = {
    salle: 'Salle de cours',
    laboratoire: 'Laboratoire',
    atelier: 'Atelier',
    informatique: 'Salle informatique',
    exterieur: 'Espace extérieur',
};

export const VENUE_KINDS = Object.keys(VENUE_KIND_LABELS) as VenueKind[];

export function venueKindLabel(kind: VenueKind): string {
    return VENUE_KIND_LABELS[kind];
}

const CLASSROOM_CODE_ALIASES: Record<string, string> = {
    '6ème': '6EME',
    '5ème': '5EME',
    '4ème': '4EME',
    '3ème': '3EME',
    '2nde': '2NDE',
    '1ère': '1ERE',
    Terminale: 'TLE',
};

export function academicYearLabel(startYear: number): string {
    return `${startYear}–${startYear + 1}`;
}

export function academicStartYear(year: AcademicYear): number {
    return Number(year.startsOn.slice(0, 4));
}

export function buildAcademicYear(startYear: number): {
    year: AcademicYear;
    terms: Term[];
} {
    const nextYear = startYear + 1;
    const id = `year-${startYear}`;

    return {
        year: {
            id,
            label: academicYearLabel(startYear),
            startsOn: `${startYear}-09-01`,
            endsOn: `${nextYear}-07-15`,
            isCurrent: false,
        },
        terms: [
            {
                id: `term-${startYear}-1`,
                academicYearId: id,
                name: '1er trimestre',
                position: 1,
                startsOn: `${startYear}-09-01`,
                endsOn: `${startYear}-12-18`,
            },
            {
                id: `term-${startYear}-2`,
                academicYearId: id,
                name: '2e trimestre',
                position: 2,
                startsOn: `${nextYear}-01-05`,
                endsOn: `${nextYear}-03-31`,
            },
            {
                id: `term-${startYear}-3`,
                academicYearId: id,
                name: '3e trimestre',
                position: 3,
                startsOn: `${nextYear}-04-12`,
                endsOn: `${nextYear}-07-15`,
            },
        ],
    };
}

export function classroomLabels(
    levelCode: string,
    section: string | null,
    trackCode: string | null,
): { code: string; name: string } {
    const levelKey = CLASSROOM_CODE_ALIASES[levelCode] ?? levelCode;
    const sectionPart = section?.trim() || null;
    const trackPart = trackCode?.trim() || null;

    return {
        code: [levelKey, sectionPart, trackPart].filter(Boolean).join('-'),
        name: [levelCode, sectionPart, trackPart].filter(Boolean).join(' '),
    };
}
