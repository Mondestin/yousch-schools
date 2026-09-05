import { Banknote, Wallet } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { index as cash } from '@/routes/cash';
import { index as payments } from '@/routes/payments';

export default function CashLayout({ children }: PropsWithChildren) {
    const { query } = useSchoolContext();
    const tabs = [
        {
            title: 'Frais scolaires',
            href: payments({ query }),
            icon: Wallet,
        },
        {
            title: 'Mouvements',
            href: cash({ query }),
            icon: Banknote,
        },
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Caisse"
                description="Frais des élèves et journal de caisse — espèces, mobile money, virement."
            />
            <PageTabs flush items={tabs} />
            {children}
        </PageShell>
    );
}
