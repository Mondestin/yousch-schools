import { Check, ListFilter, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@/components/sms/search-input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type FilterMenuOption = {
    value: string;
    label: string;
};

export type FilterMenuGroup = {
    id: string;
    label: string;
    icon: LucideIcon;
    value: string;
    options: FilterMenuOption[];
    onChange: (value: string) => void;
    allValue?: string;
    showValue?: boolean;
};

function matches(haystack: string, needle: string): boolean {
    return haystack.toLowerCase().includes(needle);
}

function groupAllValue(group: FilterMenuGroup): string | null {
    if (group.allValue !== undefined) {
        return group.allValue;
    }

    return group.options.some((option) => option.value === 'all')
        ? 'all'
        : null;
}

function FilterSubmenu({ group }: { group: FilterMenuGroup }) {
    const [query, setQuery] = useState('');
    const needle = query.trim().toLowerCase();
    const options =
        needle === ''
            ? group.options
            : group.options.filter((option) => matches(option.label, needle));
    const selected = group.options.find(
        (option) => option.value === group.value,
    );

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 rounded-[8px] text-[13px]">
                <group.icon className="text-muted-foreground size-4" />
                <span className="min-w-0 flex-1">{group.label}</span>
                {group.showValue && selected ? (
                    <span className="text-muted-foreground max-w-[7.5rem] truncate text-[12px]">
                        {selected.label}
                    </span>
                ) : null}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 p-2">
                {group.options.length > 6 ? (
                    <SearchInput
                        placeholder="Filtrer..."
                        value={query}
                        wrapperClassName="mb-2 min-w-0 max-w-none w-full"
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                    />
                ) : null}
                <div className="max-h-64 overflow-y-auto">
                    {options.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-3 text-[13px]">
                            Aucun filtre
                        </p>
                    ) : (
                        options.map((option) => {
                            const selected = option.value === group.value;

                            return (
                                <DropdownMenuItem
                                    key={option.value}
                                    className="justify-between"
                                    onSelect={() =>
                                        group.onChange(option.value)
                                    }
                                >
                                    {option.label}
                                    {selected ? (
                                        <Check className="text-primary size-4" />
                                    ) : null}
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}

export function FilterMenu({
    groups,
    label = 'Filtrer',
}: {
    groups: FilterMenuGroup[];
    label?: string;
}) {
    const [query, setQuery] = useState('');
    const needle = query.trim().toLowerCase();
    const filtered =
        needle === ''
            ? groups
            : groups.filter(
                  (group) =>
                      matches(group.label, needle) ||
                      group.options.some((option) =>
                          matches(option.label, needle),
                      ),
              );
    const active = groups.filter((group) => {
        const all = groupAllValue(group);

        return all !== null && group.value !== all;
    }).length;

    function clear(): void {
        for (const group of groups) {
            const all = groupAllValue(group);

            if (all !== null) {
                group.onChange(all);
            }
        }
    }

    return (
        <DropdownMenu
            onOpenChange={(open) => {
                if (!open) {
                    setQuery('');
                }
            }}
        >
            <DropdownMenuTrigger asChild>
                <Button variant="outline" type="button">
                    <ListFilter />
                    {label}
                    {active > 0 ? (
                        <span
                            className={cn(
                                'bg-primary/10 text-primary ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium',
                            )}
                        >
                            {active}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
                <SearchInput
                    placeholder="Filtrer..."
                    value={query}
                    wrapperClassName="mb-2 min-w-0 max-w-none w-full"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                />
                {filtered.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-3 text-[13px]">
                        Aucun filtre
                    </p>
                ) : (
                    filtered.map((group) => (
                        <FilterSubmenu key={group.id} group={group} />
                    ))
                )}
                {active > 0 ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={clear}>
                            Réinitialiser
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
