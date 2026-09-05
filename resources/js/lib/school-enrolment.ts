import type { AdmissionStatus, ReenrollmentStatus } from '@/types/school';

export function admissionStatusLabel(status: AdmissionStatus): string {
    if (status === 'recue') {
        return 'Reçue';
    }

    if (status === 'en_etude') {
        return 'En étude';
    }

    if (status === 'acceptee') {
        return 'Acceptée';
    }

    if (status === 'refusee') {
        return 'Refusée';
    }

    return 'Inscrite';
}

export function admissionStatusVariant(
    status: AdmissionStatus,
): 'muted' | 'warning' | 'success' | 'danger' | 'blue' {
    if (status === 'recue') {
        return 'muted';
    }

    if (status === 'en_etude') {
        return 'warning';
    }

    if (status === 'acceptee') {
        return 'blue';
    }

    if (status === 'refusee') {
        return 'danger';
    }

    return 'success';
}

export function reenrollmentStatusLabel(status: ReenrollmentStatus): string {
    if (status === 'demandee') {
        return 'Demandée';
    }

    if (status === 'en_etude') {
        return 'En étude';
    }

    if (status === 'validee') {
        return 'Validée';
    }

    return 'Refusée';
}

export function reenrollmentStatusVariant(
    status: ReenrollmentStatus,
): 'muted' | 'warning' | 'success' | 'danger' {
    if (status === 'demandee') {
        return 'muted';
    }

    if (status === 'en_etude') {
        return 'warning';
    }

    if (status === 'validee') {
        return 'success';
    }

    return 'danger';
}
