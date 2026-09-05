import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type DetailField = {
    label: string;
    value: ReactNode;
    /** Spans both columns, for long text such as a description. */
    wide?: boolean;
};

export function DetailDialog({
    open,
    onOpenChange,
    title,
    description,
    icon: Icon,
    fields,
    actions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    icon?: LucideIcon;
    fields: DetailField[];
    actions?: ReactNode;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {Icon && <Icon className="text-primary size-4" />}
                        {title}
                    </DialogTitle>
                    {description ? (
                        <DialogDescription>{description}</DialogDescription>
                    ) : null}
                </DialogHeader>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {fields.map((field) => (
                        <div
                            key={field.label}
                            className={field.wide ? 'sm:col-span-2' : undefined}
                        >
                            <dt className="text-muted-foreground text-[12px]">
                                {field.label}
                            </dt>
                            <dd className="mt-0.5 text-[13px] font-medium">
                                {field.value}
                            </dd>
                        </div>
                    ))}
                </dl>
                <DialogFooter>
                    {actions}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
