import type { LucideIcon } from 'lucide-react';
import { FileDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toastStub } from '@/lib/school-toast';

export const DATA_TABLE_CONTAINER = 'rounded-none border-0 overflow-visible';

export function DataTable({
    toolbar,
    children,
    empty,
    footer,
    className,
}: {
    toolbar?: ReactNode;
    children?: ReactNode;
    empty?: ReactNode;
    footer?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'bg-background flex min-h-0 flex-1 flex-col overflow-hidden',
                className,
            )}
        >
            {toolbar}
            <div className="bg-background flex min-h-0 flex-1 flex-col overflow-auto">
                {empty ? (
                    <div className="flex min-h-full flex-1 flex-col">
                        {empty}
                    </div>
                ) : (
                    children
                )}
            </div>
            {footer}
        </div>
    );
}

export function DataTableColumnHeader({
    icon: Icon,
    children,
}: {
    icon?: LucideIcon;
    children: ReactNode;
}) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {Icon ? (
                <Icon
                    className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                />
            ) : null}
            {children}
        </span>
    );
}

export function ExportButton({
    onExport,
    label = 'Exporter Excel',
}: {
    onExport?: () => void;
    label?: string;
}) {
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shadow-none"
            onClick={() => {
                if (onExport) {
                    onExport();

                    return;
                }

                toastStub();
            }}
        >
            <FileDown className="h-3.5 w-3.5" />
            {label}
        </Button>
    );
}
