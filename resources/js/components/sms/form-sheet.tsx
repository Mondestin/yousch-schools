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

export function FormSheet({
    open,
    onOpenChange,
    title,
    description,
    submitLabel = 'Créer',
    submitting = false,
    onSubmit,
    footer,
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
    children: ReactNode;
}) {
    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (submitting) {
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
                    </SheetHeader>
                    <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 [&_[data-slot=search-select-trigger]]:w-full [&_[data-slot=select-trigger]]:w-full">
                        {children}
                    </div>
                    <SheetFooter>
                        {footer ?? (
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
                        )}
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
