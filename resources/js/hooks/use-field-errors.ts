import { useState } from 'react';
import type { FieldErrors } from '@/lib/school-form';
import { parseFields } from '@/lib/school-form';
import type { z } from 'zod';

export function useFieldErrors() {
    const [errors, setErrors] = useState<FieldErrors>({});

    function clearErrors(keys?: string | string[]): void {
        if (keys === undefined) {
            setErrors({});

            return;
        }

        const list = typeof keys === 'string' ? [keys] : keys;

        setErrors((current) => {
            let changed = false;
            const next = { ...current };

            for (const key of list) {
                if (next[key] !== undefined) {
                    delete next[key];
                    changed = true;
                }
            }

            return changed ? next : current;
        });
    }

    function showErrors(next: FieldErrors): void {
        setErrors(next);
    }

    function validate<T>(schema: z.ZodType<T>, data: unknown): boolean {
        const result = parseFields(schema, data);

        if (result.ok) {
            setErrors({});

            return true;
        }

        setErrors(result.errors);

        return false;
    }

    return { errors, clearErrors, showErrors, validate };
}
