import { Head } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Field } from '@/components/sms/field';
import { TimePicker } from '@/components/sms/time-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCycleSchedules } from '@/hooks/use-cycle-schedules';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { useYearLock } from '@/hooks/use-year-lock';
import { requiredText, type FieldErrors } from '@/lib/school-form';
import { cycleLabel } from '@/lib/school-rows';
import { normalizeSchoolHours } from '@/lib/school-timetable';
import {
    hours as hoursRoute,
    index as yearsRoute,
} from '@/routes/structure';
import type {
    LabeledSchoolBreak,
    SchoolDataset,
    SchoolHours,
} from '@/types/school';

const dayHoursSchema = z
    .object({
        opensAt: requiredText('L’ouverture'),
        closesAt: requiredText('La fermeture'),
    })
    .refine((data) => data.opensAt < data.closesAt, {
        message: 'La fermeture doit être après l’ouverture.',
        path: ['closesAt'],
    });

function addMinutes(time: string, minutes: number): string {
    const [hour, minute] = time.split(':').map(Number);
    const total = (hour ?? 0) * 60 + (minute ?? 0) + minutes;
    const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);

    return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

function newBreakId(): string {
    return `break-${crypto.randomUUID().slice(0, 8)}`;
}

function labeledBreakErrors(
    item: LabeledSchoolBreak,
    hours: SchoolHours,
    index: number,
): FieldErrors {
    const prefix = `break-${item.id}`;
    const labelName = item.label.trim() || `Pause ${index + 1}`;

    if (!item.label.trim()) {
        return { [`${prefix}-label`]: 'Le libellé de la pause est obligatoire.' };
    }

    if (!item.startsAt || !item.endsAt) {
        const message = `${labelName} : indiquez le début et la fin.`;

        return {
            ...(item.startsAt ? {} : { [`${prefix}-startsAt`]: message }),
            ...(item.endsAt ? {} : { [`${prefix}-endsAt`]: message }),
        };
    }

    if (item.startsAt >= item.endsAt) {
        return {
            [`${prefix}-endsAt`]: `${labelName} : la fin doit être après le début.`,
        };
    }

    if (item.startsAt < hours.startsAt || item.endsAt > hours.endsAt) {
        return {
            [`${prefix}-startsAt`]: `${labelName} doit s’inscrire dans la journée scolaire.`,
        };
    }

    return {};
}

export default function StructureHoursPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { canMutate } = useYearLock();
    const { filter } = useSchoolContext();
    const cycle = filter.cycle;
    const cycleName = cycleLabel(cycle);
    const { schedule, patchCurrent, persistSchedule } = useCycleSchedules(
        catalog,
        cycle,
    );
    const hours = schedule.hours;
    const breaks = hours.breaks ?? [];
    const { errors, clearErrors, showErrors, validate } = useFieldErrors();
    const [savingHours, setSavingHours] = useState(false);

    function setHours(
        next: SchoolHours | ((current: SchoolHours) => SchoolHours),
    ): void {
        patchCurrent((item) => ({
            ...item,
            hours: typeof next === 'function' ? next(item.hours) : next,
        }));
    }

    function updateBreak(
        id: string,
        patch: Partial<LabeledSchoolBreak>,
    ): void {
        setHours((current) => ({
            ...current,
            breaks: (current.breaks ?? []).map((row) =>
                row.id === id ? { ...row, ...patch } : row,
            ),
        }));
    }

    function addBreak(): void {
        clearErrors();
        setHours((current) => {
            const existing = current.breaks ?? [];
            const last = existing.at(-1);

            return {
                ...current,
                breaks: [
                    ...existing,
                    {
                        id: newBreakId(),
                        label: 'Récréation',
                        startsAt: last?.endsAt || current.startsAt,
                        endsAt: addMinutes(
                            last?.endsAt || current.startsAt,
                            20,
                        ),
                    },
                ],
            };
        });
    }

    function removeBreak(id: string): void {
        clearErrors([
            `break-${id}-label`,
            `break-${id}-startsAt`,
            `break-${id}-endsAt`,
        ]);
        setHours((current) => ({
            ...current,
            breaks: (current.breaks ?? []).filter((row) => row.id !== id),
        }));
    }

    async function saveHours(): Promise<void> {
        clearErrors();
        const dayOk = validate(dayHoursSchema, {
            opensAt: hours.startsAt,
            closesAt: hours.endsAt,
        });
        const extra: FieldErrors = {};

        breaks.forEach((item, index) => {
            Object.assign(extra, labeledBreakErrors(item, hours, index));
        });

        for (let index = 0; index < breaks.length; index += 1) {
            for (let other = index + 1; other < breaks.length; other += 1) {
                if (
                    breaks[index].startsAt < breaks[other].endsAt &&
                    breaks[other].startsAt < breaks[index].endsAt
                ) {
                    extra[`break-${breaks[other].id}-startsAt`] =
                        'Cette pause chevauche une autre pause.';
                }
            }
        }

        const outside = schedule.periods.find(
            (period) =>
                period.startsAt < hours.startsAt ||
                period.endsAt > hours.endsAt ||
                breaks.some(
                    (item) =>
                        period.startsAt < item.endsAt &&
                        item.startsAt < period.endsAt,
                ),
        );

        if (outside) {
            extra.closesAt = `Le créneau ${outside.id.toUpperCase()} chevauche une pause ou sort de la journée.`;
        }

        if (!dayOk || Object.keys(extra).length > 0) {
            showErrors(extra);

            return;
        }

        const normalized = normalizeSchoolHours({
            ...hours,
            recess: null,
            lunch: null,
        });

        setSavingHours(true);

        try {
            await persistSchedule(
                { ...schedule, hours: normalized },
                { successMessage: 'Journée scolaire enregistrée' },
                showErrors,
            );
        } finally {
            setSavingHours(false);
        }
    }

    return (
        <>
            <Head title="Horaires" />
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-3xl px-6 py-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[1.05rem] font-semibold tracking-tight">
                                Journée scolaire
                            </h2>
                            <p className="text-muted-foreground mt-1 text-[13px]">
                                Définissez l’amplitude et les pauses du{' '}
                                {cycleName}.
                            </p>
                        </div>
                        {canMutate ? (
                            <Button
                                type="button"
                                size="sm"
                                disabled={savingHours}
                                onClick={() => {
                                    void saveHours();
                                }}
                            >
                                {savingHours
                                    ? 'Enregistrement…'
                                    : 'Enregistrer'}
                            </Button>
                        ) : null}
                    </div>

                    <div className="mt-8 space-y-8">
                        <section>
                            <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-[0.08em] uppercase">
                                Amplitude
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="opensAt"
                                    label="Ouverture"
                                    required
                                    error={errors.opensAt}
                                >
                                    <TimePicker
                                        id="opensAt"
                                        value={hours.startsAt}
                                        onChange={(value) => {
                                            clearErrors([
                                                'opensAt',
                                                'closesAt',
                                            ]);
                                            setHours((current) => ({
                                                ...current,
                                                startsAt: value,
                                            }));
                                        }}
                                    />
                                </Field>
                                <Field
                                    id="closesAt"
                                    label="Fermeture"
                                    required
                                    error={errors.closesAt}
                                >
                                    <TimePicker
                                        id="closesAt"
                                        value={hours.endsAt}
                                        onChange={(value) => {
                                            clearErrors('closesAt');
                                            setHours((current) => ({
                                                ...current,
                                                endsAt: value,
                                            }));
                                        }}
                                    />
                                </Field>
                            </div>
                        </section>

                        <section>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
                                        Pauses
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-[12px]">
                                        Récréations et pauses visibles sur
                                        l’emploi du temps.
                                    </p>
                                </div>
                                {canMutate ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={addBreak}
                                    >
                                        <Plus className="size-3.5" />
                                        Ajouter
                                    </Button>
                                ) : null}
                            </div>

                            {breaks.length === 0 ? (
                                <p className="text-muted-foreground py-8 text-center text-[13px]">
                                    Aucune pause pour ce cycle.
                                </p>
                            ) : (
                                <div className="border-border divide-border divide-y border-y">
                                    <div className="text-muted-foreground grid grid-cols-[minmax(0,1.4fr)_6.5rem_6.5rem_2.25rem] gap-3 px-0 py-2 text-[11px] font-medium tracking-wide uppercase">
                                        <span>Libellé</span>
                                        <span>Début</span>
                                        <span>Fin</span>
                                        <span className="sr-only">Actions</span>
                                    </div>
                                    {breaks.map((item) => {
                                        const prefix = `break-${item.id}`;

                                        return (
                                            <div
                                                key={item.id}
                                                className="grid grid-cols-[minmax(0,1.4fr)_6.5rem_6.5rem_2.25rem] items-start gap-3 py-3"
                                            >
                                                <Field
                                                    id={`${prefix}-label`}
                                                    label="Libellé"
                                                    required
                                                    hideLabel
                                                    error={
                                                        errors[
                                                            `${prefix}-label`
                                                        ]
                                                    }
                                                >
                                                    <Input
                                                        id={`${prefix}-label`}
                                                        value={item.label}
                                                        placeholder="Ex. Récréation"
                                                        disabled={!canMutate}
                                                        onChange={(event) => {
                                                            clearErrors(
                                                                `${prefix}-label`,
                                                            );
                                                            updateBreak(
                                                                item.id,
                                                                {
                                                                    label: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            );
                                                        }}
                                                    />
                                                </Field>
                                                <Field
                                                    id={`${prefix}-startsAt`}
                                                    label="Début"
                                                    hideLabel
                                                    error={
                                                        errors[
                                                            `${prefix}-startsAt`
                                                        ]
                                                    }
                                                >
                                                    <TimePicker
                                                        id={`${prefix}-startsAt`}
                                                        value={item.startsAt}
                                                        onChange={(value) => {
                                                            clearErrors([
                                                                `${prefix}-startsAt`,
                                                                `${prefix}-endsAt`,
                                                            ]);
                                                            updateBreak(
                                                                item.id,
                                                                {
                                                                    startsAt:
                                                                        value,
                                                                },
                                                            );
                                                        }}
                                                    />
                                                </Field>
                                                <Field
                                                    id={`${prefix}-endsAt`}
                                                    label="Fin"
                                                    hideLabel
                                                    error={
                                                        errors[
                                                            `${prefix}-endsAt`
                                                        ]
                                                    }
                                                >
                                                    <TimePicker
                                                        id={`${prefix}-endsAt`}
                                                        value={item.endsAt}
                                                        onChange={(value) => {
                                                            clearErrors([
                                                                `${prefix}-startsAt`,
                                                                `${prefix}-endsAt`,
                                                            ]);
                                                            updateBreak(
                                                                item.id,
                                                                {
                                                                    endsAt: value,
                                                                },
                                                            );
                                                        }}
                                                    />
                                                </Field>
                                                {canMutate ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive mt-0.5 size-9"
                                                        aria-label={`Retirer ${item.label || 'la pause'}`}
                                                        onClick={() =>
                                                            removeBreak(item.id)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                ) : (
                                                    <span />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}

StructureHoursPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Horaires', href: hoursRoute() },
    ],
};
