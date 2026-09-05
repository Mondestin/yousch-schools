import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { fr as calendarFr } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function parseIsoDate(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date): string {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function DatePicker({
    id,
    value,
    onChange,
    placeholder = 'Choisir une date',
    required = false,
    disabled = false,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}) {
    const selected = parseIsoDate(value);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    data-empty={!selected}
                    className={cn(
                        'w-full justify-start font-normal',
                        !selected && 'text-muted-foreground',
                    )}
                >
                    <CalendarDays />
                    {selected
                        ? format(selected, 'd MMMM yyyy', { locale: fr })
                        : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    locale={calendarFr}
                    selected={selected}
                    defaultMonth={selected}
                    required={required}
                    onSelect={(date: Date | undefined) => {
                        if (date) {
                            onChange(toIsoDate(date));
                        }
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
