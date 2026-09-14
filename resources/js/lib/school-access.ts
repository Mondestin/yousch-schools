import type { StaffRole } from '@/types/school';

export type NavKey =
    | 'dashboard'
    | 'students'
    | 'guardians'
    | 'teachers'
    | 'subjects'
    | 'timetable'
    | 'attendance'
    | 'assessments'
    | 'reports'
    | 'results'
    | 'cash'
    | 'inventory'
    | 'announcements'
    | 'documents'
    | 'id-cards'
    | 'staff'
    | 'school'
    | 'subscription'
    | 'structure'
    | 'settings';

const ALL_NAV: NavKey[] = [
    'dashboard',
    'students',
    'guardians',
    'teachers',
    'subjects',
    'timetable',
    'attendance',
    'assessments',
    'reports',
    'results',
    'cash',
    'inventory',
    'announcements',
    'documents',
    'id-cards',
    'staff',
    'school',
    'subscription',
    'structure',
    'settings',
];

const ROLE_NAV: Record<StaffRole, NavKey[]> = {
    admin: ALL_NAV,
    directeur: ALL_NAV.filter((key) => key !== 'staff'),
    secretaire: [
        'dashboard',
        'students',
        'guardians',
        'cash',
        'inventory',
        'announcements',
        'documents',
        'id-cards',
        'school',
        'structure',
        'settings',
    ],
    enseignant: [
        'dashboard',
        'students',
        'teachers',
        'subjects',
        'timetable',
        'attendance',
        'assessments',
        'reports',
        'results',
        'settings',
    ],
    eleve: [],
    parent: [],
};

export const STAFF_ROLES: StaffRole[] = [
    'admin',
    'directeur',
    'secretaire',
    'enseignant',
];

export const PORTAL_ROLES: StaffRole[] = ['eleve', 'parent'];

export function isStaffRole(role: StaffRole): boolean {
    return STAFF_ROLES.includes(role);
}

export function isPortalRole(role: StaffRole): boolean {
    return PORTAL_ROLES.includes(role);
}

export function roleLabel(role: StaffRole): string {
    if (role === 'admin') {
        return 'Administrateur';
    }

    if (role === 'directeur') {
        return 'Directeur';
    }

    if (role === 'secretaire') {
        return 'Secrétaire';
    }

    if (role === 'eleve') {
        return 'Élève';
    }

    if (role === 'parent') {
        return 'Parent';
    }

    return 'Enseignant';
}

export function roleNav(role: StaffRole): NavKey[] {
    return ROLE_NAV[role];
}

export function canAccess(role: StaffRole, key: NavKey): boolean {
    return ROLE_NAV[role].includes(key);
}

export function roleSummary(role: StaffRole): string {
    if (role === 'admin') {
        return 'Compte, abonnement Yousch, utilisateurs et toute l’administration.';
    }

    if (role === 'directeur') {
        return 'Pilotage de l’établissement, pédagogie et caisse. Pas de gestion des comptes staff.';
    }

    if (role === 'secretaire') {
        return 'Élèves, tuteurs, caisse, matériel et annonces. Pas de notes ni de bulletins.';
    }

    return 'Classes affectées, emploi du temps, présences, évaluations et bulletins.';
}
