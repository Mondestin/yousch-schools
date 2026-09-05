import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const EMPTY = '__none__';

function timeOptions(): string[] {
    const slots: string[] = [];

    for (let hour = 6; hour <= 18; hour += 1) {
        for (const minute of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) {
            slots.push(
                `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            );
        }
    }

    return slots;
}

const TIMES = timeOptions();

export function TimePicker({
    id,
    value,
    onChange,
    placeholder = 'Heure',
    allowEmpty = false,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    allowEmpty?: boolean;
}) {
    const options = value && !TIMES.includes(value) ? [value, ...TIMES] : TIMES;
    const selectValue = value ? value : allowEmpty ? EMPTY : undefined;

    return (
        <Select
            value={selectValue}
            onValueChange={(next) => onChange(next === EMPTY ? '' : next)}
        >
            <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {allowEmpty ? (
                    <SelectItem value={EMPTY}>{placeholder}</SelectItem>
                ) : null}
                {options.map((time) => (
                    <SelectItem key={time} value={time}>
                        {time}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
