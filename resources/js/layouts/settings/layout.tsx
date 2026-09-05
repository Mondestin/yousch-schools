import { Shield, User } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { query } = useSchoolContext();
    const settingsTabs = [
        {
            title: 'Profil',
            href: edit({ query }),
            icon: User,
        },
        {
            title: 'Sécurité',
            href: editSecurity({ query }),
            icon: Shield,
        },
    ];

    return (
        <PageShell flush>
            <PageHeader
                flush
                title="Paramètres"
                description="Profil, mot de passe et authentification du compte."
            />
            <PageTabs flush items={settingsTabs} />
            <div className="max-w-4xl px-6 py-5">{children}</div>
        </PageShell>
    );
}
