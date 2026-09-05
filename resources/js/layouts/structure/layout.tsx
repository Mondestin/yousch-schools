import { CalendarRange, Clock, DoorOpen, Layers, School } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageTabs } from '@/components/sms/page-tabs';
import { useSchoolContext } from '@/hooks/use-school-context';
import { cycleLabel, isLyceeCycle } from '@/lib/school-rows';
import {
    classes,
    hours,
    index as years,
    tracks,
    venues,
} from '@/routes/structure';

export default function StructureLayout({ children }: PropsWithChildren) {
    const { query, cycle } = useSchoolContext();
    const tabs = [
        {
            title: 'Années',
            href: years({ query }),
            icon: CalendarRange,
        },
        {
            title: 'Classes',
            href: classes({ query }),
            icon: School,
        },
        ...(isLyceeCycle(cycle)
            ? [
                  {
                      title: 'Séries',
                      href: tracks({ query }),
                      icon: Layers,
                  },
              ]
            : []),
        {
            title: 'Salles de classe',
            href: venues({ query }),
            icon: DoorOpen,
        },
        {
            title: 'Horaires',
            href: hours({ query }),
            icon: Clock,
        },
    ];

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader
                flush
                title="Structure"
                description={`Années, classes, salles et horaires ${cycleLabel(cycle)} — affichage 6ème, 2nde, 1ère.`}
            />
            <PageTabs flush items={tabs} />
            {children}
        </PageShell>
    );
}
