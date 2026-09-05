import { ClipboardList, PenLine, ShieldCheck } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { cycleLabel } from '@/lib/school-rows';
import { control, entry, index as assessments } from '@/routes/assessments';

export default function AssessmentLayout({ children }: PropsWithChildren) {
    const { query, cycle, academicYearLabel } = useSchoolContext();
    const tabs = [
        {
            title: 'Liste',
            href: assessments({ query }),
            icon: ClipboardList,
        },
        {
            title: 'Saisie',
            href: entry({ query }),
            icon: PenLine,
        },
        {
            title: 'Contrôle',
            href: control({ query }),
            icon: ShieldCheck,
        },
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Devoirs & notes"
                description={`Notes /20 · ${cycleLabel(cycle)} · ${academicYearLabel}. Devoirs puis composition de trimestre — une grille, pas de colonnes sFRA.`}
            />
            <PageTabs flush items={tabs} match="exact" />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
            </div>
        </PageShell>
    );
}
