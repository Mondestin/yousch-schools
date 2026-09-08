import { Building2, Wallet } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { fees, index as school } from '@/routes/etablissement';

export default function SchoolLayout({ children }: PropsWithChildren) {
    const { query } = useSchoolContext();
    const tabs = [
        {
            title: 'Identité',
            href: school({ query }),
            icon: Building2,
        },
        {
            title: 'Frais scolaires',
            href: fees({ query }),
            icon: Wallet,
        },
    ];

    return (
        <PageShell flush>
            <PageHeader
                flush
                title="Établissement"
                description="Identité imprimée sur les bulletins et tarifs par cycle."
            />
            <PageTabs flush items={tabs} />
            <div className="px-6 py-5">{children}</div>
        </PageShell>
    );
}
