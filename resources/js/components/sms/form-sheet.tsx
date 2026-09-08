import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useYearLock } from '@/hooks/use-year-lock';

export function FormSheet({
    open,
    onOpenChange,
    title,
    description,
    submitLabel = 'Créer',
    submitting = false,
    onSubmit,
    footer,
    allowWhenReadOnly = false,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    submitLabel?: string;
    submitting?: boolean;
    onSubmit: () => void;
    footer?: ReactNode;
    /** Keep submit enabled on past years (e.g. structure / années). */
    allowWhenReadOnly?: boolean;
    children: ReactNode;
}) {
    const { locked, lockHint } = useYearLock({ allowWhenReadOnly });
    const blocked = locked || submitting;

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (blocked) {
            return;
        }

        onSubmit();
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="gap-0 rounded-l-[8px] sm:max-w-md">
                <form
                    className="flex h-full min-h-0 flex-col"
                    noValidate
                    onSubmit={handleSubmit}
                >
                    <SheetHeader>
                        <SheetTitle className="pr-8 text-[18px]">
                            {title}
                        </SheetTitle>
                        {description ? (
                            <SheetDescription>{description}</SheetDescription>
                        ) : null}
                        {locked && lockHint ? (
                            <p className="text-amber-800 dark:text-amber-200 text-[12px]">
                                {lockHint}
                            </p>
                        ) : null}
                    </SheetHeader>
                    <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 [&_[data-slot=search-select-trigger]]:w-full [&_[data-slot=select-trigger]]:w-full">
                        <fieldset
                            disabled={locked}
                            className="min-w-0 space-y-4 border-0 p-0 disabled:opacity-80"
                        >
                            {children}
                        </fieldset>
                    </div>
                    <SheetFooter>
                        {locked ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Fermer
                            </Button>
                        ) : (
                            (footer ?? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={submitting}
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Annuler
                                    </Button>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting
                                            ? 'Enregistrement…'
                                            : submitLabel}
                                    </Button>
                                </>
                            ))
                        )}
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
