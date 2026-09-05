import { CheckIcon, ChevronDownIcon, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type SearchSelectOption = {
    value: string;
    label: string;
    keywords?: string;
};

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function SearchSelect({
    value,
    onValueChange,
    options,
    placeholder = 'Choisir...',
    searchPlaceholder = 'Rechercher...',
    emptyText = 'Aucun résultat',
    disabled = false,
    id,
    className,
    size = 'default',
    'aria-label': ariaLabel,
}: {
    value: string;
    onValueChange: (value: string) => void;
    options: SearchSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    id?: string;
    className?: string;
    size?: 'sm' | 'default';
    'aria-label'?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const selected = options.find((option) => option.value === value);
    const filtered = useMemo(() => {
        const needle = normalize(query.trim());

        if (needle === '') {
            return options;
        }

        return options.filter((option) =>
            normalize(`${option.label} ${option.keywords ?? ''}`).includes(
                needle,
            ),
        );
    }, [options, query]);

    useEffect(() => {
        if (!open) {
            setQuery('');
        }
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    id={id}
                    disabled={disabled}
                    data-slot="search-select-trigger"
                    data-size={size}
                    data-placeholder={selected ? undefined : ''}
                    aria-label={ariaLabel}
                    className={cn(
                        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-primary focus-visible:ring-ring aria-invalid:ring-primary/20 aria-invalid:border-primary flex w-fit items-center justify-between gap-2 rounded-[8px] border bg-transparent px-3 py-2 text-left text-[13px] whitespace-nowrap shadow-none transition-[color,box-shadow] outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=search-select-value]:line-clamp-1 *:data-[slot=search-select-value]:flex *:data-[slot=search-select-value]:items-center *:data-[slot=search-select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                        className,
                    )}
                >
                    <span
                        data-slot="search-select-value"
                        className={cn(
                            'min-w-0 flex-1 truncate',
                            selected ? '' : 'text-muted-foreground',
                        )}
                    >
                        {selected?.label ?? placeholder}
                    </span>
                    <ChevronDownIcon className="size-4 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[var(--radix-popper-anchor-width)] min-w-[12rem] p-0"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    inputRef.current?.focus();
                }}
            >
                <div className="flex items-center gap-2 border-b px-2.5">
                    <Search className="text-muted-foreground size-3.5 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') {
                                return;
                            }

                            event.preventDefault();
                            const first = filtered[0];

                            if (!first) {
                                return;
                            }

                            onValueChange(first.value);
                            setOpen(false);
                        }}
                        placeholder={searchPlaceholder}
                        className="placeholder:text-muted-foreground h-9 w-full bg-transparent text-[13px] outline-none"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                    {filtered.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-6 text-center text-[13px]">
                            {emptyText}
                        </p>
                    ) : (
                        filtered.map((option) => {
                            const active = option.value === value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-left text-sm outline-hidden select-none',
                                        'hover:bg-accent hover:text-accent-foreground',
                                        active ? 'bg-accent' : '',
                                    )}
                                >
                                    <span className="min-w-0 flex-1 truncate">
                                        {option.label}
                                    </span>
                                    {active ? (
                                        <span className="absolute right-2 flex size-3.5 items-center justify-center">
                                            <CheckIcon className="size-4" />
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
