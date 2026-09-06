import { FileBadge2, FileStack, Inbox } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { cycleLabel } from '@/lib/school-rows';
import {
    index as documents,
    requests as documentRequests,
    templates as documentTemplates,
} from '@/routes/documents';

export default function DocumentsLayout({ children }: PropsWithChildren) {
    const { query, filter, academicYearLabel } = useSchoolContext();
    const tabs = [
        {
            title: 'Registre',
            href: documents({ query }),
            icon: FileBadge2,
        },
        {
            title: 'Demandes',
            href: documentRequests({ query }),
            icon: Inbox,
        },
        {
            title: 'Modèles',
            href: documentTemplates({ query }),
            icon: FileStack,
        },
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Documents"
                description={`Registre, demandes et modèles - ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
            />
            <PageTabs flush match="exact" items={tabs} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
            </div>
        </PageShell>
    );
}
