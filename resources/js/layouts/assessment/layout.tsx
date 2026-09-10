import {
    ClipboardList,
    FileSpreadsheet,
    GraduationCap,
    PenLine,
    CalendarRange,
    ShieldCheck,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { cycleLabel } from '@/lib/school-rows';
import {
    compositions,
    control,
    devoirs,
    entry,
    examens,
    windows,
} from '@/routes/assessments';

export default function AssessmentLayout({ children }: PropsWithChildren) {
    const { query, cycle, academicYearLabel, staffRole } = useSchoolContext();
    const isPrivileged =
        staffRole === 'admin' || staffRole === 'directeur';

    const tabs = [
        {
            title: 'Devoirs',
            href: devoirs({ query }),
            icon: ClipboardList,
        },
        {
            title: 'Compositions',
            href: compositions({ query }),
            icon: FileSpreadsheet,
        },
        {
            title: 'Examens',
            href: examens({ query }),
            icon: GraduationCap,
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
        ...(isPrivileged
            ? [
                  {
                      title: 'Fenêtres',
                      href: windows({ query }),
                      icon: CalendarRange,
                  },
              ]
            : []),
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Évaluations"
                description={`Notes /20 · ${cycleLabel(cycle)} · ${academicYearLabel}. Devoirs, compositions et examens gérés séparément. Fenêtres de saisie pour compositions et examens.`}
            />
            <PageTabs flush items={tabs} match="exact" />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
            </div>
        </PageShell>
    );
}
