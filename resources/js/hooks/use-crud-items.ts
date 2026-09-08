import { useCallback } from 'react';
import { crudItems } from '@/lib/school-crud';
import { useYearLock } from '@/hooks/use-year-lock';

type CrudItemsArgs = Parameters<typeof crudItems>[0] & {
    allowWhenReadOnly?: boolean;
};

/**
 * Same as crudItems, but locks edit / duplicate / delete when the selected year is not current.
 */
export function useCrudItems(options?: { allowWhenReadOnly?: boolean }) {
    const { locked } = useYearLock({
        allowWhenReadOnly: options?.allowWhenReadOnly,
    });

    return useCallback(
        ({ allowWhenReadOnly, ...args }: CrudItemsArgs) =>
            crudItems({
                ...args,
                locked: locked && !allowWhenReadOnly,
            }),
        [locked],
    );
}
