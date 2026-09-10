import { usePage } from '@inertiajs/react';
import {
    ClipboardList,
    FileBadge2,
    FolderOpen,
    History,
    LayoutDashboard,
    ShieldAlert,
    Users,
    Wallet,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { CycleBadge, TrackBadge } from '@/components/sms/code-badge';
import {
    ageFromBornOn,
    PersonProfileHeader,
} from '@/components/sms/person-profile-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { enrollmentStatusLabel } from '@/lib/school-rows';
import { genderLabel, studentFiche } from '@/lib/school-students';
import {
    discipline as studentDiscipline,
    documents as studentDocuments,
    dossier as studentDossier,
    grades as studentGrades,
    guardians as studentGuardians,
    payments as studentPayments,
    previous as studentPrevious,
    show,
} from '@/routes/students';
import type { SchoolDataset } from '@/types/school';

export default function StudentLayout({ children }: PropsWithChildren) {
    const { catalog, studentId } = usePage<{
        catalog: SchoolDataset;
        studentId: string;
    }>().props;
    const pageComponent = usePage().component;
    const { query, filter } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);
    const isDocuments = pageComponent === 'students/documents';

    if (!fiche) {
        return children;
    }

    const options = { query };
    const tabs = [
        {
            title: 'Synthèse',
            href: show(studentId, options),
            icon: LayoutDashboard,
        },
        {
            title: 'Parcours',
            href: studentPrevious(studentId, options),
            icon: History,
        },
        {
            title: 'Dossier',
            href: studentDossier(studentId, options),
            icon: FolderOpen,
        },
        {
            title: 'Tuteurs',
            href: studentGuardians(studentId, options),
            icon: Users,
        },
        {
            title: 'Notes',
            href: studentGrades(studentId, options),
            icon: ClipboardList,
        },
        {
            title: 'Paiements',
            href: studentPayments(studentId, options),
            icon: Wallet,
        },
        {
            title: 'Documents',
            href: studentDocuments(studentId, options),
            icon: FileBadge2,
        },
        {
            title: 'Discipline',
            href: studentDiscipline(studentId, options),
            icon: ShieldAlert,
        },
    ];

    const age = ageFromBornOn(fiche.student.bornOn);
    const metaBits = [
        genderLabel(fiche.student.gender),
        age === null ? null : `${age} ans`,
    ].filter(Boolean);

    return (
        <PageShell flush className="overflow-hidden">
            <PersonProfileHeader
                name={fiche.name}
                photoUrl={fiche.student.photoUrl}
                code={fiche.student.matricule}
                badges={
                    <>
                        <CycleBadge cycle={filter.cycle} />
                        {fiche.trackCode ? (
                            <TrackBadge code={fiche.trackCode} />
                        ) : null}
                    </>
                }
                metaLine={metaBits.join(' · ')}
                phone={fiche.student.phone}
                email={fiche.student.email}
                details={[
                    {
                        label: 'Ville',
                        value: fiche.student.city || '-',
                    },
                    {
                        label: 'Quartier',
                        value: fiche.student.neighborhood || '-',
                    },
                    {
                        label: 'Classe',
                        value: fiche.classroomName,
                    },
                    {
                        label: 'Cycle',
                        value: fiche.cycleName,
                    },
                    {
                        label: 'Année scolaire',
                        value: fiche.yearLabel,
                    },
                    {
                        label: 'Inscription',
                        value: fiche.enrolledOnLabel,
                    },
                ]}
                status={{
                    label: 'Statut scolaire',
                    title: fiche.enrollment
                        ? enrollmentStatusLabel(fiche.enrollment.status)
                        : 'Non inscrit',
                    rows: [
                        { label: 'Classe', value: fiche.classroomName },
                        { label: 'Année', value: fiche.yearLabel },
                        {
                            label: 'Série',
                            value: fiche.trackCode ?? '-',
                        },
                    ],
                }}
            />
            <div className="mt-4">
                <PageTabs flush items={tabs} />
            </div>
            <div
                className={
                    isDocuments
                        ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-4 pb-4'
                        : 'min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6'
                }
            >
                {children}
            </div>
        </PageShell>
    );
}
