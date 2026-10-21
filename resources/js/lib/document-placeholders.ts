/** Placeholder vocabulary shared with IssuedDocumentService (PHP). */

export type DocumentPlaceholderKey =
    | 'name'
    | 'matricule'
    | 'classroomName'
    | 'yearLabel'
    | 'trackSuffix'
    | 'trackCode'
    | 'bornOnLabel'
    | 'genderLabel'
    | 'directorName'
    | 'schoolName'
    | 'city'
    | 'address'
    | 'phone'
    | 'issuedOn'
    | 'number'
    | 'title';

export type DocumentPlaceholderMeta = {
    key: DocumentPlaceholderKey;
    label: string;
    description: string;
};

/** All body placeholders available for issuable school documents. */
export const DOCUMENT_PLACEHOLDERS: DocumentPlaceholderMeta[] = [
    {
        key: 'name',
        label: 'Nom de l’élève',
        description: 'Nom et prénom de l’élève',
    },
    {
        key: 'matricule',
        label: 'Matricule',
        description: 'Numéro matricule de l’élève',
    },
    {
        key: 'classroomName',
        label: 'Classe',
        description: 'Libellé de la classe (ex. 2nde A)',
    },
    {
        key: 'yearLabel',
        label: 'Année scolaire',
        description: 'Année scolaire (ex. 2026–2027)',
    },
    {
        key: 'trackSuffix',
        label: 'Série (suffixe)',
        description: '« (série F2) » si lycée, sinon vide',
    },
    {
        key: 'trackCode',
        label: 'Code série',
        description: 'Code de la série (ex. F2) sans parenthèses',
    },
    {
        key: 'bornOnLabel',
        label: 'Date de naissance',
        description: 'Date de naissance formatée',
    },
    {
        key: 'genderLabel',
        label: 'Sexe',
        description: 'masculin / féminin',
    },
    {
        key: 'directorName',
        label: 'Chef d’établissement',
        description: 'Nom du directeur / de la directrice',
    },
    {
        key: 'schoolName',
        label: 'Établissement',
        description: 'Nom de l’école',
    },
    {
        key: 'city',
        label: 'Ville',
        description: 'Ville de l’établissement',
    },
    {
        key: 'address',
        label: 'Adresse',
        description: 'Adresse de l’établissement',
    },
    {
        key: 'phone',
        label: 'Téléphone',
        description: 'Téléphone de l’établissement',
    },
    {
        key: 'issuedOn',
        label: 'Date d’émission',
        description: 'Date de délivrance du document',
    },
    {
        key: 'number',
        label: 'N° de document',
        description: 'Numéro officiel (ex. ATT-2026-0001)',
    },
    {
        key: 'title',
        label: 'Titre',
        description: 'Titre du document',
    },
];

/**
 * Placeholders typically used in the default body for each kind.
 * Shared keys always apply; extras are listed when useful for that type.
 */
const CORE_KEYS: DocumentPlaceholderKey[] = [
    'directorName',
    'schoolName',
    'name',
    'genderLabel',
    'bornOnLabel',
    'matricule',
    'classroomName',
    'trackSuffix',
    'yearLabel',
];

const BY_KIND: Record<string, DocumentPlaceholderKey[]> = {
    attestation: CORE_KEYS,
    certificat: CORE_KEYS,
    attestation_reussite: CORE_KEYS,
    attestation_radiation: CORE_KEYS,
    attestation_transfert: CORE_KEYS,
    attestation_bourse: CORE_KEYS,
    certificat_conduite: CORE_KEYS,
};

export function placeholdersForKind(kind: string): DocumentPlaceholderMeta[] {
    const keys = BY_KIND[kind] ?? CORE_KEYS;
    const extras: DocumentPlaceholderKey[] = [
        'issuedOn',
        'number',
        'city',
        'address',
        'phone',
        'trackCode',
        'title',
    ];
    const ordered = [...keys, ...extras.filter((key) => !keys.includes(key))];

    return ordered
        .map((key) => DOCUMENT_PLACEHOLDERS.find((item) => item.key === key))
        .filter((item): item is DocumentPlaceholderMeta => item !== undefined);
}

export function fillDocumentPlaceholders(
    source: string,
    values: Record<string, string>,
): string {
    return source.replaceAll(
        /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
        (_, key: string) => values[key] ?? `{{${key}}}`,
    );
}
