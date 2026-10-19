import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
    id,
    label,
    required = false,
    hint,
    error,
    hideLabel = false,
    children,
}: {
    id?: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    /** Keep the label for a11y but hide it visually (table-style rows). */
    hideLabel?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5 [&_[data-slot=search-select-trigger]]:w-full [&_[data-slot=select-trigger]]:w-full">
            <Label htmlFor={id} className={cn(hideLabel && 'sr-only')}>
                {label}
                {required && !hideLabel ? (
                    <span className="text-danger"> *</span>
                ) : null}
            </Label>
            {children}
            {error ? (
                <p className="text-danger text-[12px]" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-muted-foreground text-[13px]">{hint}</p>
            ) : null}
        </div>
    );
}
