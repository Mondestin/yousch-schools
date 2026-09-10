import { FileText, Trophy } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { canAccess } from '@/lib/school-access';
import { index as reports } from '@/routes/reports';
import { index as results } from '@/routes/results';

export default function ReportsLayout({ children }: PropsWithChildren) {
    const { query, staffRole } = useSchoolContext();
    const tabs = [
        ...(canAccess(staffRole, 'reports')
            ? [
                  {
                      title: 'Bulletins',
                      href: reports({ query }),
                      icon: FileText,
                  },
              ]
            : []),
        ...(canAccess(staffRole, 'results')
            ? [
                  {
                      title: 'Résultats',
                      href: results({ query }),
                      icon: Trophy,
                  },
              ]
            : []),
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Bulletins"
                description="Bulletins individuels et bilans de classe par trimestre."
            />
            <PageTabs flush items={tabs} match="exact" />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
            </div>
        </PageShell>
    );
}
