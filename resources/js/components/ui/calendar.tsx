import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from 'lucide-react';
import * as React from 'react';
import {
    type DayButton,
    DayPicker,
    getDefaultClassNames,
} from 'react-day-picker';
import 'react-day-picker/style.css';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    captionLayout = 'label',
    buttonVariant = 'ghost',
    formatters,
    components,
    ...props
}: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
    const defaultClassNames = getDefaultClassNames();

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(
                'bg-background group/calendar p-2 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
                String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
                String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
                className,
            )}
            captionLayout={captionLayout}
            formatters={{
                formatMonthDropdown: (date) =>
                    date.toLocaleString('default', { month: 'short' }),
                ...formatters,
            }}
            classNames={{
                root: cn('w-fit', defaultClassNames.root),
                months: cn(
                    'relative flex flex-col gap-4 md:flex-row',
                    defaultClassNames.months,
                ),
                month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
                nav: cn(
                    'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
                    defaultClassNames.nav,
                ),
                button_previous: cn(
                    buttonVariants({ variant: buttonVariant, size: 'icon' }),
                    'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
                    defaultClassNames.button_previous,
                ),
                button_next: cn(
                    buttonVariants({ variant: buttonVariant, size: 'icon' }),
                    'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
                    defaultClassNames.button_next,
                ),
                month_caption: cn(
                    'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
                    defaultClassNames.month_caption,
                ),
                dropdowns: cn(
                    'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-[13px] font-medium',
                    defaultClassNames.dropdowns,
                ),
                caption_label: cn(
                    'text-[13px] font-medium select-none',
                    defaultClassNames.caption_label,
                ),
                month_grid: cn(
                    'w-full border-collapse',
                    defaultClassNames.month_grid,
                ),
                weekdays: cn('flex', defaultClassNames.weekdays),
                weekday: cn(
                    'text-muted-foreground flex-1 rounded-[8px] text-[11px] font-medium select-none',
                    defaultClassNames.weekday,
                ),
                week: cn('mt-1 flex w-full', defaultClassNames.week),
                day: cn(
                    'group/day relative aspect-square h-full w-full p-0 text-center select-none',
                    defaultClassNames.day,
                ),
                today: cn(
                    'bg-accent text-accent-foreground rounded-[8px]',
                    defaultClassNames.today,
                ),
                outside: cn(
                    'text-muted-foreground aria-selected:text-muted-foreground',
                    defaultClassNames.outside,
                ),
                disabled: cn(
                    'text-muted-foreground opacity-50',
                    defaultClassNames.disabled,
                ),
                hidden: cn('invisible', defaultClassNames.hidden),
                ...classNames,
            }}
            components={{
                Root: ({ className, rootRef, ...rootProps }) => (
                    <div
                        data-slot="calendar"
                        ref={rootRef}
                        className={cn(className)}
                        {...rootProps}
                    />
                ),
                Chevron: ({ className, orientation, ...chevronProps }) => {
                    if (orientation === 'left') {
                        return (
                            <ChevronLeftIcon
                                className={cn('size-4', className)}
                                {...chevronProps}
                            />
                        );
                    }

                    if (orientation === 'right') {
                        return (
                            <ChevronRightIcon
                                className={cn('size-4', className)}
                                {...chevronProps}
                            />
                        );
                    }

                    return (
                        <ChevronDownIcon
                            className={cn('size-4', className)}
                            {...chevronProps}
                        />
                    );
                },
                DayButton: CalendarDayButton,
                ...components,
            }}
            {...props}
        />
    );
}

function CalendarDayButton({
    className,
    day,
    modifiers,
    ...props
}: React.ComponentProps<typeof DayButton>) {
    const defaultClassNames = getDefaultClassNames();
    const ref = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (modifiers.focused) {
            ref.current?.focus();
        }
    }, [modifiers.focused]);

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
                modifiers.selected &&
                !modifiers.range_start &&
                !modifiers.range_end &&
                !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            className={cn(
                'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-primary/10 data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 rounded-[8px] leading-none font-normal [&>span]:text-[10px] [&>span]:opacity-70',
                defaultClassNames.day,
                className,
            )}
            {...props}
        />
    );
}

export { Calendar, CalendarDayButton };
