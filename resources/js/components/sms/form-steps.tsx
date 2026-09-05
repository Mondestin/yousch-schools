import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FormStep = {
    id: string;
    title: string;
};

export function FormSteps({
    steps,
    current,
    onSelect,
}: {
    steps: FormStep[];
    current: number;
    onSelect?: (index: number) => void;
}) {
    return (
        <ol className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
                const done = index < current;
                const active = index === current;

                return (
                    <li key={step.id}>
                        <button
                            type="button"
                            onClick={() => onSelect?.(index)}
                            className={cn(
                                'flex items-center gap-2 rounded-[8px] border px-3 py-1.5 text-[13px] font-medium transition-colors',
                                active
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : done
                                      ? 'border-primary/30 bg-primary/5 text-primary'
                                      : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-5 items-center justify-center rounded-full text-[11px]',
                                    active
                                        ? 'bg-primary-foreground/20'
                                        : done
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted',
                                )}
                            >
                                {done ? (
                                    <Check className="size-3" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            {step.title}
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

export function FormStepActions({
    current,
    total,
    submitLabel,
    disabled = false,
    onCancel,
    onBack,
    onNext,
}: {
    current: number;
    total: number;
    submitLabel: string;
    disabled?: boolean;
    onCancel: () => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const last = current === total - 1;

    return (
        <>
            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={onCancel}
            >
                Annuler
            </Button>
            {current > 0 ? (
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={onBack}
                >
                    Retour
                </Button>
            ) : null}
            {last ? (
                <Button type="submit" disabled={disabled}>
                    {submitLabel}
                </Button>
            ) : (
                <Button type="button" disabled={disabled} onClick={onNext}>
                    Suivant
                </Button>
            )}
        </>
    );
}
