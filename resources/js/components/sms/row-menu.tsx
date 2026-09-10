import type { LucideIcon } from 'lucide-react';
import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
import type { ConfirmCopy } from '@/components/sms/confirm-dialog';
import { ConfirmDialog } from '@/components/sms/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type RowMenuItem = {
    label: string;
    onSelect: () => void;
    icon?: LucideIcon;
    destructive?: boolean;
    disabled?: boolean;
    /** Shows a confirmation dialog before running onSelect. */
    confirm?: ConfirmCopy;
    /** Escape hatch for destructive items that need no confirmation. */
    skipConfirm?: boolean;
};

function needsConfirm(item: RowMenuItem): boolean {
    if (item.skipConfirm) {
        return false;
    }

    return Boolean(item.destructive) || item.confirm != null;
}

export function RowMenu({ items }: { items: RowMenuItem[] }) {
    const [pending, setPending] = useState<RowMenuItem | null>(null);
    const main = items.filter((item) => !item.destructive);
    const danger = items.filter((item) => item.destructive);

    function select(item: RowMenuItem): void {
        if (needsConfirm(item)) {
            setPending(item);

            return;
        }

        item.onSelect();
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        aria-label="Actions"
                    >
                        <EllipsisVertical className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {main.map((item) => (
                        <RowMenuEntry
                            key={item.label}
                            item={item}
                            onSelect={select}
                        />
                    ))}
                    {danger.length > 0 && main.length > 0 ? (
                        <DropdownMenuSeparator />
                    ) : null}
                    {danger.map((item) => (
                        <RowMenuEntry
                            key={item.label}
                            item={item}
                            onSelect={select}
                            destructive
                        />
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setPending(null);
                    }
                }}
                onConfirm={() => pending?.onSelect()}
                confirmLabel={pending?.label}
                {...pending?.confirm}
            />
        </>
    );
}

function RowMenuEntry({
    item,
    onSelect,
    destructive = false,
}: {
    item: RowMenuItem;
    onSelect: (item: RowMenuItem) => void;
    destructive?: boolean;
}) {
    const Icon = item.icon;

    return (
        <DropdownMenuItem
            variant={destructive ? 'destructive' : undefined}
            disabled={item.disabled}
            onSelect={() => onSelect(item)}
        >
            {Icon ? <Icon /> : <span className="size-4" aria-hidden />}
            {item.label}
        </DropdownMenuItem>
    );
}
