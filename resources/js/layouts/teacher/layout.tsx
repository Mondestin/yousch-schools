import { usePage } from '@inertiajs/react';
import { Briefcase, FolderOpen, User } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { CodeBadge } from '@/components/sms/code-badge';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { Badge } from '@/components/ui/badge';
import { useSchoolContext } from '@/hooks/use-school-context';
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
    const { query, annee } = useSchoolContext();
    const fiche = teacherFiche(catalog, teacherId);

    if (!fiche) {
        return children;
    }

    const options = { query };
    const tabs = [
        {
            title: 'Identité',
            href: show(teacherId, options),
            icon: User,
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

    return (
        <PageShell flush className="overflow-hidden">
            <header className="flex shrink-0 items-start gap-4 px-6 pt-6">
                {fiche.teacher.photoUrl ? (
                    <img
                        src={fiche.teacher.photoUrl}
                        alt=""
                        className="size-16 rounded-[8px] border object-cover"
                    />
                ) : (
                    <Briefcase className="text-primary mt-1 size-8 shrink-0" />
                )}
                <div className="min-w-0 space-y-1">
                    <h1 className="text-[22px] font-semibold tracking-tight">
                        {fiche.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <CodeBadge>{fiche.teacher.code}</CodeBadge>
                        <Badge
                            variant={
                                fiche.teacher.status === 'actif'
                                    ? 'success'
                                    : 'muted'
                            }
                        >
                            {teacherStatusLabel(fiche.teacher.status)}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-[13px]">
                        {fiche.teacher.position?.trim() || 'Enseignant'} ·{' '}
                        {annee}
                    </p>
                </div>
            </header>
            <PageTabs flush items={tabs} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
                {children}
            </div>
        </PageShell>
    );
}
