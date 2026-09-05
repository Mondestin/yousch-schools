import type { ComponentProps } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { isNoteInRange, parseNote } from '@/lib/school-grades';

export function NoteInput({
    value,
    onValueChange,
    ...props
}: {
    value: string;
    onValueChange: (value: string) => void;
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'>) {
    return (
        <Input
            inputMode="decimal"
            min={0}
            max={20}
            value={value}
            {...props}
            onChange={(event) => onValueChange(event.target.value)}
            onBlur={(event) => {
                const parsed = parseNote(event.target.value);

                if (parsed !== null && !isNoteInRange(parsed)) {
                    toast.error('La note doit être comprise entre 0 et 20.');
                }

                props.onBlur?.(event);
            }}
        />
    );
}
