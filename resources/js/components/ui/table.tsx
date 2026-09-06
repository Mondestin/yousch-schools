import * as React from 'react';
import { cn } from '@/lib/utils';

function Table({
    className,
    containerClassName,
    ...props
}: React.ComponentProps<'table'> & {
    containerClassName?: string;
}) {
    return (
        <div
            data-slot="table-container"
            className={cn(
                'relative w-full overflow-x-auto overscroll-x-contain rounded-[8px] border',
                containerClassName,
            )}
        >
            <p className="text-muted-foreground border-b px-3 py-1.5 text-[11px] md:hidden">
                Faites défiler horizontalement pour voir toutes les colonnes.
            </p>
            <table
                data-slot="table"
                className={cn(
                    'w-full border-separate border-spacing-0 caption-bottom text-[13px]',
                    className,
                )}
                {...props}
            />
        </div>
    );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
    return (
        <thead data-slot="table-header" className={cn(className)} {...props} />
    );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
    return (
        <tbody
            data-slot="table-body"
            className={cn(
                '[&>tr:nth-child(even)>td]:bg-muted/35 [&>tr:nth-child(odd)>td]:bg-background',
                className,
            )}
            {...props}
        />
    );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn(
                'bg-muted/40 border-t font-medium [&>tr]:last:border-b-0',
                className,
            )}
            {...props}
        />
    );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
    return (
        <tr
            data-slot="table-row"
            className={cn(
                'group transition-colors hover:[&>td]:bg-muted/40 data-[state=selected]:[&>td]:bg-muted',
                className,
            )}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                'bg-background text-foreground sticky top-0 z-20 border-b border-r border-border px-3 py-2 text-left align-middle text-[12px] font-medium whitespace-nowrap last:border-r-0 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
                className,
            )}
            {...props}
        />
    );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
    return (
        <td
            data-slot="table-cell"
            className={cn(
                'text-foreground border-b border-r border-border px-3 py-[9px] align-middle text-[13px] whitespace-nowrap last:border-r-0 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
                className,
            )}
            {...props}
        />
    );
}

function TableCaption({
    className,
    ...props
}: React.ComponentProps<'caption'>) {
    return (
        <caption
            data-slot="table-caption"
            className={cn('text-muted-foreground mt-4 text-[13px]', className)}
            {...props}
        />
    );
}

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
};
