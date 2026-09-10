import { usePage } from '@inertiajs/react';
import { Briefcase, FolderOpen, LayoutDashboard } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import {
    ageFromBornOn,
    PersonProfileHeader,
} from '@/components/sms/person-profile-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { Badge } from '@/components/ui/badge';
import { useSchoolContext } from '@/hooks/use-school-context';
import { formatFrDate } from '@/lib/school-rows';
import { genderLabel } from '@/lib/school-students';
import { teacherFiche, teacherStatusLabel } from '@/lib/school-staff';
import {
    assignments as teacherAssignments,
    dossier as teacherDossier,
    show,
} from '@/routes/teachers';
import type { SchoolDataset } from '@/types/school';

export default function TeacherLayout({ children }: PropsWithChildren) {
    const { catalog, teacherId } = usePage<{
        catalog: SchoolDataset;
        teacherId: string;
    }>().props;
    const { query, annee, filter } = useSchoolContext();
    const fiche = teacherFiche(catalog, teacherId, filter.academicYearId);

    if (!fiche) {
        return children;
    }

    const options = { query };
    const tabs = [
        {
            title: 'Synthèse',
            href: show(teacherId, options),
            icon: LayoutDashboard,
        },
        {
            title: 'Dossier',
            href: teacherDossier(teacherId, options),
            icon: FolderOpen,
        },
        {
            title: 'Affectations',
            href: teacherAssignments(teacherId, options),
            icon: Briefcase,
        },
    ];

    const age = ageFromBornOn(fiche.teacher.bornOn);
    const metaBits = [
        genderLabel(fiche.teacher.gender),
        age === null ? null : `${age} ans`,
        fiche.teacher.position?.trim() || 'Enseignant',
    ].filter(Boolean);

    return (
        <PageShell flush className="overflow-hidden">
            <PersonProfileHeader
                name={fiche.name}
                photoUrl={fiche.teacher.photoUrl}
                code={fiche.teacher.code}
                badges={
                    <Badge
                        variant={
                            fiche.teacher.status === 'actif'
                                ? 'success'
                                : 'muted'
                        }
                    >
                        {teacherStatusLabel(fiche.teacher.status)}
                    </Badge>
                }
                metaLine={metaBits.join(' · ')}
                phone={fiche.teacher.phone}
                email={fiche.teacher.email}
                details={[
                    {
                        label: 'Poste',
                        value: fiche.teacher.position?.trim() || 'Enseignant',
                    },
                    {
                        label: 'Qualification',
                        value: fiche.teacher.qualification || '-',
                    },
                    {
                        label: 'Ville',
                        value: fiche.teacher.city || '-',
                    },
                    {
                        label: 'Quartier',
                        value: fiche.teacher.neighborhood || '-',
                    },
                    {
                        label: 'Embauche',
                        value: formatFrDate(fiche.teacher.hiredOn),
                    },
                    {
                        label: 'Année scolaire',
                        value: annee,
                    },
                ]}
                status={{
                    label: 'Statut professionnel',
                    title: teacherStatusLabel(fiche.teacher.status),
                    rows: [
                        {
                            label: 'Affectations',
                            value: String(fiche.assignments.length),
                        },
                        {
                            label: 'Année',
                            value: annee,
                        },
                        {
                            label: 'Téléphone',
                            value: fiche.teacher.phone || '—',
                        },
                    ],
                }}
            />
            <div className="mt-4">
                <PageTabs flush items={tabs} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
                {children}
            </div>
        </PageShell>
    );
}
