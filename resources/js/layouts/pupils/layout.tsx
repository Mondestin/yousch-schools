import { GraduationCap, RefreshCcw, UserPlus } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { cycleLabel } from '@/lib/school-rows';
import {
    admissions,
    index as students,
    reenrollments,
} from '@/routes/students';

export default function PupilsLayout({ children }: PropsWithChildren) {
    const { query, filter, academicYearLabel } = useSchoolContext();
    const tabs = [
        {
            title: 'Élèves',
            href: students({ query }),
            icon: GraduationCap,
        },
        {
            title: 'Demandes d’admission',
            href: admissions({ query }),
            icon: UserPlus,
        },
        {
            title: 'Réinscriptions',
            href: reenrollments({ query }),
            icon: RefreshCcw,
        },
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Élèves"
                description={`Inscriptions, admissions et réinscriptions — ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
            />
            <PageTabs flush match="exact" items={tabs} />
            {children}
        </PageShell>
    );
}
