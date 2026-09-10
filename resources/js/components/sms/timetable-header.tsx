import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import {
    ChevronLeft,
    ChevronRight,
    Columns2,
    Grid3x3,
    List,
    Plus,
    Printer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    formatCalendarHeading,
    formatCalendarRange,
    type TimetableView,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';

const VIEW_ITEMS: {
    value: TimetableView;
    label: string;
    icon: LucideIcon;
}[] = [
    { value: 'day', label: 'Jour', icon: List },
    { value: 'week', label: 'Semaine', icon: Columns2 },
    { value: 'month', label: 'Mois', icon: Grid3x3 },
];

export function TimetableHeader({
    date,
    view,
    eventCount,
    filters,
    onViewChange,
    onShift,
    onToday,
    onAdd,
    onPrint,
}: {
    date: Date;
    view: TimetableView;
    eventCount: number;
    filters?: ReactNode;
    onViewChange: (view: TimetableView) => void;
    onShift: (direction: -1 | 1) => void;
    onToday: () => void;
    onAdd: () => void;
    onPrint?: () => void;
}) {
    return (
        <div className="border-border flex shrink-0 flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="border-border flex size-14 shrink-0 flex-col items-start overflow-hidden rounded-lg border"
                    onClick={onToday}
                    aria-label="Aujourd’hui"
                >
                    <span className="bg-primary text-primary-foreground flex h-6 w-full items-center justify-center text-center text-xs font-semibold uppercase">
                        {format(date, 'MMM', { locale: fr })}
                    </span>
                    <span className="flex w-full flex-1 items-center justify-center text-lg font-bold">
                        {format(date, 'd')}
                    </span>
                </button>
                <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg font-semibold">
                            {formatCalendarHeading(date)}
                        </h1>
                        {eventCount > 0 ? (
                            <Badge variant="code">{eventCount} cours</Badge>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="size-[26px] px-0 [&_svg]:size-4"
                            aria-label="Période précédente"
                            onClick={() => onShift(-1)}
                        >
                            <ChevronLeft />
                        </Button>
                        <p className="text-muted-foreground text-[13px]">
                            {formatCalendarRange(date, view)}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            className="size-[26px] px-0 [&_svg]:size-4"
                            aria-label="Période suivante"
                            onClick={() => onShift(1)}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="no-print flex flex-wrap items-center gap-3">
                <div className="inline-flex">
                    {VIEW_ITEMS.map((item, index) => {
                        const Icon = item.icon;
                        const active = view === item.value;

                        return (
                            <Button
                                key={item.value}
                                type="button"
                                variant={active ? 'default' : 'outline'}
                                aria-pressed={active}
                                className={cn(
                                    'rounded-none first:rounded-l-[8px] last:rounded-r-[8px]',
                                    index > 0 && '-ml-px',
                                )}
                                onClick={() => onViewChange(item.value)}
                            >
                                <Icon />
                                <span className="hidden xl:block">
                                    {item.label}
                                </span>
                            </Button>
                        );
                    })}
                </div>
                {filters}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onPrint?.()}
                >
                    <Printer />
                    <span className="hidden xl:block">Imprimer</span>
                </Button>
                <Button type="button" onClick={onAdd}>
                    <Plus />
                    Ajouter
                </Button>
            </div>
        </div>
    );
}
