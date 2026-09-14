import type { DossierFile } from '@/types/school';

export type DossierSlot = {
    code: string;
    label: string;
    keywords: string[];
};

export const DOSSIER_SLOTS: DossierSlot[] = [
    {
        code: 'extrait_naissance',
        label: 'Extrait de naissance',
        keywords: ['extrait', 'naissance', 'acte'],
    },
    {
        code: 'photo_identite',
        label: 'Photo d’identité',
        keywords: ['photo', 'identite', 'identité', 'portrait'],
    },
    {
        code: 'carnet_vaccination',
        label: 'Carnet de vaccination',
        keywords: ['vaccin', 'carnet'],
    },
    {
        code: 'certificat_medical',
        label: 'Certificat médical',
        keywords: ['medical', 'médical', 'certificat'],
    },
];

export type DossierStatus = {
    complete: boolean;
    present: string[];
    missing: string[];
    missingLabels: string[];
};

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

export function evaluateDossier(
    photoUrl: string | null | undefined,
    files: Array<Pick<DossierFile, 'name'> | { name: string }>,
): DossierStatus {
    const present: string[] = [];

    if (photoUrl && photoUrl.trim() !== '') {
        present.push('photo_identite');
    }

    const haystacks = files.map((file) => normalize(file.name));

    for (const slot of DOSSIER_SLOTS) {
        if (present.includes(slot.code)) {
            continue;
        }

        const matched = haystacks.some((haystack) =>
            slot.keywords.some((keyword) =>
                haystack.includes(normalize(keyword)),
            ),
        );

        if (matched) {
            present.push(slot.code);
        }
    }

    const missing: string[] = [];
    const missingLabels: string[] = [];

    for (const slot of DOSSIER_SLOTS) {
        if (!present.includes(slot.code)) {
            missing.push(slot.code);
            missingLabels.push(slot.label);
        }
    }

    return {
        complete: missing.length === 0,
        present,
        missing,
        missingLabels,
    };
}
