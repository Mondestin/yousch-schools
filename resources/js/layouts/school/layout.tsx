import { Building2, CreditCard, Wallet } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { canAccess } from '@/lib/school-access';
import { fees, index as school, subscription } from '@/routes/etablissement';

export default function SchoolLayout({ children }: PropsWithChildren) {
    const { query, staffRole } = useSchoolContext();
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
        ...(canAccess(staffRole, 'subscription')
            ? [
                  {
                      title: 'Abonnement',
                      href: subscription({ query }),
                      icon: CreditCard,
                  },
              ]
            : []),
    ];

    return (
        <PageShell flush>
            <PageHeader
                flush
                title="Établissement"
                description="Identité imprimée sur les bulletins, tarifs par cycle et abonnement YouSchlow."
            />
            <PageTabs flush items={tabs} />
            <div className="px-6 py-5">{children}</div>
        </PageShell>
    );
}
