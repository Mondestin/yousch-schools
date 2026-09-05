import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({
    id,
    label,
    required = false,
    hint,
    error,
    children,
}: {
    id?: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5 [&_[data-slot=search-select-trigger]]:w-full [&_[data-slot=select-trigger]]:w-full">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-danger"> *</span>}
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
