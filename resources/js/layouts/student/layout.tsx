import { usePage } from '@inertiajs/react';
import {
    ClipboardList,
    FileBadge2,
    GraduationCap,
    ShieldAlert,
    User,
    Users,
    Wallet,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { CodeBadge, CycleBadge, TrackBadge } from '@/components/sms/code-badge';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { studentFiche } from '@/lib/school-students';
import {
    discipline as studentDiscipline,
    documents as studentDocuments,
    grades as studentGrades,
    guardians as studentGuardians,
    payments as studentPayments,
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
            title: 'Identité',
            href: show(studentId, options),
            icon: User,
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

    return (
        <PageShell flush className="overflow-hidden">
            <header className="flex shrink-0 items-start gap-4 px-6 pt-6">
                {fiche.student.photoUrl ? (
                    <img
                        src={fiche.student.photoUrl}
                        alt=""
                        className="size-16 rounded-[8px] border object-cover"
                    />
                ) : (
                    <GraduationCap className="text-primary mt-1 size-8 shrink-0" />
                )}
                <div className="min-w-0 space-y-1">
                    <h1 className="text-[22px] font-semibold tracking-tight">
                        {fiche.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <CodeBadge>{fiche.student.matricule}</CodeBadge>
                        <CycleBadge cycle={filter.cycle} />
                        {fiche.trackCode ? (
                            <TrackBadge code={fiche.trackCode} />
                        ) : null}
                    </div>
                    <p className="text-muted-foreground text-[13px]">
                        {fiche.classroomName} · {fiche.cycleName} ·{' '}
                        {fiche.yearLabel}
                    </p>
                </div>
            </header>
            <PageTabs flush items={tabs} />
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
