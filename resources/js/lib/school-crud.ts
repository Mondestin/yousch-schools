import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import type { ConfirmCopy } from '@/components/sms/confirm-dialog';
import type { RowMenuItem } from '@/components/sms/row-menu';

/**
 * Builds the standard read / update / duplicate / delete menu so every list
 * table exposes the same actions in the same order.
 */
export function crudItems({
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    deleteDisabled = false,
    confirm,
    extras = [],
}: {
    onView?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    /** Keeps the entry visible but greyed out, e.g. a record still in use. */
    deleteDisabled?: boolean;
    confirm?: ConfirmCopy;
    extras?: RowMenuItem[];
}): RowMenuItem[] {
    const items: RowMenuItem[] = [];

    if (onView) {
        items.push({ label: 'Voir le détail', icon: Eye, onSelect: onView });
    }

    if (onEdit) {
        items.push({ label: 'Modifier', icon: Pencil, onSelect: onEdit });
    }

    if (onDuplicate) {
        items.push({ label: 'Dupliquer', icon: Copy, onSelect: onDuplicate });
    }

    items.push(...extras);

    if (onDelete) {
        items.push({
            label: 'Supprimer',
            icon: Trash2,
            destructive: true,
            disabled: deleteDisabled,
            confirm,
            onSelect: onDelete,
        });
    }

    return items;
}
