import { Field } from '@/components/sms/field';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { genderLabel } from '@/lib/school-students';
import type { Gender } from '@/types/school';

export function GenderSelect({
    id = 'gender',
    label = 'Genre',
    value,
    required = false,
    error,
    onChange,
}: {
    id?: string;
    label?: string;
    value: Gender;
    required?: boolean;
    error?: string;
    onChange: (value: Gender) => void;
}) {
    return (
        <Field id={id} label={label} required={required} error={error}>
            <Select
                value={value}
                onValueChange={(next) => onChange(next as Gender)}
            >
                <SelectTrigger id={id} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="femme">
                        {genderLabel('femme')}
                    </SelectItem>
                    <SelectItem value="homme">
                        {genderLabel('homme')}
                    </SelectItem>
                </SelectContent>
            </Select>
        </Field>
    );
}
