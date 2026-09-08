import { Head } from '@inertiajs/react';
import { Clock, EllipsisVertical, Hash, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { TimePicker } from '@/components/sms/time-picker';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useClientTable } from '@/hooks/use-client-table';
import { useCrudItems } from '@/hooks/use-crud-items';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { useYearLock } from '@/hooks/use-year-lock';
import { parseFields, requiredText, type FieldErrors } from '@/lib/school-form';
import { cycleLabel } from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import {
    completeBreak,
    defaultCycleSchedule,
    periodFitsHours,
    periodLabel,
    periodsOverlap,
} from '@/lib/school-timetable';
import { ApiError, apiData } from '@/lib/api';
import { upsert as upsertSchedules } from '@/routes/api/v1/school/schedules';
import { hours as hoursRoute, index as yearsRoute } from '@/routes/structure';
import type {
    CycleSchedule,
    SchoolBreak,
    SchoolDataset,
    SchoolHours,
    TimetablePeriod,
} from '@/types/school';

type PeriodForm = {
    startsAt: string;
    endsAt: string;
};

const periodSchema = z
    .object({
        startsAt: requiredText('L’heure de début'),
        endsAt: requiredText('L’heure de fin'),
    })
    .refine((data) => data.startsAt < data.endsAt, {
        message: 'L’heure de fin doit être après l’heure de début.',
        path: ['endsAt'],
    });

const dayHoursSchema = z
    .object({
        opensAt: requiredText('L’ouverture'),
        closesAt: requiredText('La fermeture'),
    })
    .refine((data) => data.opensAt < data.closesAt, {
        message: 'La fermeture doit être après l’ouverture.',
        path: ['closesAt'],
    });

function nextPeriodId(periods: TimetablePeriod[]): string {
    const used = new Set(
        periods.map((item) => {
            const match = /^p(\d+)$/.exec(item.id);

            return match ? Number(match[1]) : 0;
        }),
    );
    let index = 1;

    while (used.has(index)) {
        index += 1;
    }

    return `p${index}`;
}

function addMinutes(time: string, minutes: number): string {
    const [hour, minute] = time.split(':').map(Number);
    const total = (hour ?? 0) * 60 + (minute ?? 0) + minutes;
    const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);

    return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

function patchBreak(
    item: SchoolBreak | null,
    field: 'startsAt' | 'endsAt',
    value: string,
): SchoolBreak | null {
    const next = {
        startsAt: field === 'startsAt' ? value : (item?.startsAt ?? ''),
        endsAt: field === 'endsAt' ? value : (item?.endsAt ?? ''),
    };

    if (!next.startsAt && !next.endsAt) {
        return null;
    }

    return next;
}

function breakFieldErrors(
    item: SchoolBreak | null,
    hours: SchoolHours,
    label: string,
    startKey: string,
    endKey: string,
): FieldErrors {
    if (!item) {
        return {};
    }

    if (!item.startsAt || !item.endsAt) {
        const message = `${label} : indiquez le début et la fin.`;

        return {
            ...(item.startsAt ? {} : { [startKey]: message }),
            ...(item.endsAt ? {} : { [endKey]: message }),
        };
    }

    if (item.startsAt >= item.endsAt) {
        return { [endKey]: `${label} : la fin doit être après le début.` };
    }

    if (item.startsAt < hours.startsAt || item.endsAt > hours.endsAt) {
        return {
            [startKey]: `${label} doit s’inscrire dans la journée scolaire.`,
        };
    }

    return {};
}

export default function StructureHoursPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const crudItems = useCrudItems();
    const { locked, canMutate } = useYearLock();

    const { filter } = useSchoolContext();
    const cycle = filter.cycle;
    const cycleName = cycleLabel(cycle);
    const [schedules, setSchedules] = useState<CycleSchedule[]>(() => {
        const byCycle = new Map(
            catalog.schedules.map((item) => [item.cycle, item]),
        );

        return catalog.cycles.map(
            (option) =>
                byCycle.get(option.value) ?? defaultCycleSchedule(option.value),
        );
    });
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState<TimetablePeriod | null>(null);
    const { errors, clearErrors, showErrors, validate } = useFieldErrors();

    useEffect(() => {
        setOpen(false);
        setViewing(null);
        setSearch('');
        clearErrors();
    }, [cycle]);

    const schedule =
        schedules.find((item) => item.cycle === cycle) ??
        defaultCycleSchedule(cycle);
    const hours = schedule.hours;
    const periods = schedule.periods;
    const [form, setForm] = useState<PeriodForm>({
        startsAt: hours.startsAt,
        endsAt: addMinutes(hours.startsAt, 30),
    });
    const [savingHours, setSavingHours] = useState(false);
    const [savingPeriod, setSavingPeriod] = useState(false);

    async function persistSchedule(
        next: CycleSchedule,
        options?: { successMessage?: string; silent?: boolean },
    ): Promise<boolean> {
        try {
            const saved = await apiData<CycleSchedule[]>(
                upsertSchedules.url(),
                {
                    method: 'PUT',
                    body: {
                        schedules: [
                            {
                                cycle: next.cycle,
                                hours: next.hours,
                                periods: next.periods,
                            },
                        ],
                    },
                },
            );

            setSchedules((current) => {
                const byCycle = new Map(
                    saved.map((item) => [item.cycle, item]),
                );

                return current.map((item) => byCycle.get(item.cycle) ?? item);
            });

            if (!options?.silent) {
                toastSaved(options?.successMessage);
            }

            return true;
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);

            return false;
        }
    }

    function patchCurrent(
        write: (schedule: CycleSchedule) => CycleSchedule,
    ): void {
        setSchedules((current) => {
            const previous =
                current.find((item) => item.cycle === cycle) ??
                defaultCycleSchedule(cycle);
            const updated = write(previous);

            if (!current.some((item) => item.cycle === cycle)) {
                return [...current, updated];
            }

            return current.map((item) =>
                item.cycle === cycle ? updated : item,
            );
        });
    }

    function setHours(
        next: SchoolHours | ((current: SchoolHours) => SchoolHours),
    ): void {
        patchCurrent((item) => ({
            ...item,
            hours: typeof next === 'function' ? next(item.hours) : next,
        }));
    }

    const inUse = useMemo(() => {
        const classroomIds = new Set(
            catalog.classrooms
                .filter((classroom) => classroom.cycle === cycle)
                .map((classroom) => classroom.id),
        );

        return new Set(
            catalog.timetableSlots
                .filter((slot) => classroomIds.has(slot.classroomId))
                .map((slot) => slot.periodId),
        );
    }, [catalog.classrooms, catalog.timetableSlots, cycle]);
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const source = [...periods].sort((left, right) =>
            left.startsAt.localeCompare(right.startsAt),
        );

        if (needle === '') {
            return source;
        }

        return source.filter((period) =>
            `${period.id} ${period.startsAt} ${period.endsAt} ${periodLabel(period.id, periods)}`
                .toLowerCase()
                .includes(needle),
        );
    }, [periods, search]);
    const table = useClientTable(rows);

    function openCreate(): void {
        const last = rows.at(-1);
        const startsAt = last?.endsAt ?? hours.startsAt;
        setEditingId(null);
        setForm({
            startsAt,
            endsAt: addMinutes(startsAt, 30),
        });
        clearErrors();
        setOpen(true);
    }

    function openEdit(period: TimetablePeriod): void {
        setEditingId(period.id);
        setForm({
            startsAt: period.startsAt,
            endsAt: period.endsAt,
        });
        clearErrors();
        setOpen(true);
    }

    async function saveHours(): Promise<void> {
        if (locked) {
            return;
        }
        const day = parseFields(dayHoursSchema, {
            opensAt: hours.startsAt,
            closesAt: hours.endsAt,
        });
        const extra: FieldErrors = {
            ...breakFieldErrors(
                hours.recess,
                hours,
                'La récréation',
                'recessStartsAt',
                'recessEndsAt',
            ),
            ...breakFieldErrors(
                hours.lunch,
                hours,
                'La pause de midi',
                'lunchStartsAt',
                'lunchEndsAt',
            ),
        };
        const recess = completeBreak(hours.recess);
        const lunch = completeBreak(hours.lunch);

        if (recess && lunch && periodsOverlap(recess, lunch)) {
            extra.lunchStartsAt =
                'La récréation et la pause de midi se chevauchent.';
        }

        const outside = periods.find(
            (period) => !periodFitsHours(period, hours),
        );

        if (outside) {
            extra.closesAt = `Le créneau ${periodLabel(outside.id, periods)} chevauche une pause ou sort de la journée.`;
        }

        if (!day.ok || Object.keys(extra).length > 0) {
            showErrors({
                ...(day.ok ? {} : day.errors),
                ...extra,
            });

            return;
        }

        setSavingHours(true);

        try {
            await persistSchedule(
                {
                    ...schedule,
                    hours: {
                        ...hours,
                        recess,
                        lunch,
                    },
                },
                { successMessage: `Horaires du ${cycleName} enregistrés` },
            );
        } finally {
            setSavingHours(false);
        }
    }

    async function savePeriod(): Promise<void> {
        if (!validate(periodSchema, form)) {
            return;
        }

        const draft: Pick<TimetablePeriod, 'startsAt' | 'endsAt'> = {
            startsAt: form.startsAt,
            endsAt: form.endsAt,
        };

        if (!periodFitsHours(draft, hours)) {
            showErrors({
                endsAt: 'Le créneau doit s’inscrire dans la journée, sans chevaucher la récréation ni la pause de midi.',
            });

            return;
        }

        const clash = periods.find(
            (period) =>
                period.id !== editingId && periodsOverlap(period, draft),
        );

        if (clash) {
            showErrors({
                startsAt: `Ce créneau chevauche ${periodLabel(clash.id, periods)}.`,
            });

            return;
        }

        const payload: TimetablePeriod = {
            id: editingId ?? nextPeriodId(periods),
            startsAt: draft.startsAt,
            endsAt: draft.endsAt,
        };

        const nextPeriods = editingId
            ? periods.map((item) => (item.id === editingId ? payload : item))
            : [...periods, payload];

        setSavingPeriod(true);

        try {
            const ok = await persistSchedule({
                ...schedule,
                periods: nextPeriods,
            });

            if (ok) {
                setOpen(false);
            }
        } finally {
            setSavingPeriod(false);
        }
    }

    async function removePeriod(period: TimetablePeriod): Promise<void> {
        if (inUse.has(period.id)) {
            toast.error(
                'Ce créneau est utilisé dans l’emploi du temps. Retirez d’abord les cours.',
            );

            return;
        }

        const nextPeriods = periods.filter((item) => item.id !== period.id);
        const label = periodLabel(period.id, periods);
        const ok = await persistSchedule(
            { ...schedule, periods: nextPeriods },
            { silent: true },
        );

        if (ok) {
            toastRemoved(`Créneau ${label} supprimé`);
        }
    }

    return (
        <>
            <Head title="Horaires" />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="border-border shrink-0 space-y-3 border-b px-6 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid flex-1 gap-3 sm:grid-cols-3">
                            <div>
                                <p className="mb-2 text-[13px] font-medium">
                                    Journée scolaire
                                </p>
                                <div className="flex flex-wrap items-end gap-2">
                                    <div className="w-[7.5rem]">
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
                                    </div>
                                    <div className="w-[7.5rem]">
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
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-[13px] font-medium">
                                    Récréation
                                </p>
                                <div className="flex flex-wrap items-end gap-2">
                                    <div className="w-[7.5rem]">
                                        <Field
                                            id="recessStartsAt"
                                            label="Début"
                                            error={errors.recessStartsAt}
                                        >
                                            <TimePicker
                                                id="recessStartsAt"
                                                value={
                                                    hours.recess?.startsAt ?? ''
                                                }
                                                placeholder="Aucune"
                                                allowEmpty
                                                onChange={(value) => {
                                                    clearErrors([
                                                        'recessStartsAt',
                                                        'recessEndsAt',
                                                        'lunchStartsAt',
                                                    ]);
                                                    setHours((current) => ({
                                                        ...current,
                                                        recess: patchBreak(
                                                            current.recess,
                                                            'startsAt',
                                                            value,
                                                        ),
                                                    }));
                                                }}
                                            />
                                        </Field>
                                    </div>
                                    <div className="w-[7.5rem]">
                                        <Field
                                            id="recessEndsAt"
                                            label="Fin"
                                            error={errors.recessEndsAt}
                                        >
                                            <TimePicker
                                                id="recessEndsAt"
                                                value={
                                                    hours.recess?.endsAt ?? ''
                                                }
                                                placeholder="Aucune"
                                                allowEmpty
                                                onChange={(value) => {
                                                    clearErrors([
                                                        'recessStartsAt',
                                                        'recessEndsAt',
                                                        'lunchStartsAt',
                                                    ]);
                                                    setHours((current) => ({
                                                        ...current,
                                                        recess: patchBreak(
                                                            current.recess,
                                                            'endsAt',
                                                            value,
                                                        ),
                                                    }));
                                                }}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-[13px] font-medium">
                                    Pause de midi
                                </p>
                                <div className="flex flex-wrap items-end gap-2">
                                    <div className="w-[7.5rem]">
                                        <Field
                                            id="lunchStartsAt"
                                            label="Début"
                                            error={errors.lunchStartsAt}
                                        >
                                            <TimePicker
                                                id="lunchStartsAt"
                                                value={
                                                    hours.lunch?.startsAt ?? ''
                                                }
                                                placeholder="Aucune"
                                                allowEmpty
                                                onChange={(value) => {
                                                    clearErrors([
                                                        'lunchStartsAt',
                                                        'lunchEndsAt',
                                                    ]);
                                                    setHours((current) => ({
                                                        ...current,
                                                        lunch: patchBreak(
                                                            current.lunch,
                                                            'startsAt',
                                                            value,
                                                        ),
                                                    }));
                                                }}
                                            />
                                        </Field>
                                    </div>
                                    <div className="w-[7.5rem]">
                                        <Field
                                            id="lunchEndsAt"
                                            label="Fin"
                                            error={errors.lunchEndsAt}
                                        >
                                            <TimePicker
                                                id="lunchEndsAt"
                                                value={
                                                    hours.lunch?.endsAt ?? ''
                                                }
                                                placeholder="Aucune"
                                                allowEmpty
                                                onChange={(value) => {
                                                    clearErrors([
                                                        'lunchStartsAt',
                                                        'lunchEndsAt',
                                                    ]);
                                                    setHours((current) => ({
                                                        ...current,
                                                        lunch: patchBreak(
                                                            current.lunch,
                                                            'endsAt',
                                                            value,
                                                        ),
                                                    }));
                                                }}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {canMutate ? (
                            <Button
                                type="button"
                                size="sm"
                                className="shrink-0 self-start lg:self-end"
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
                    <p className="text-muted-foreground text-[12px]">
                        Créneaux du {cycleName} entre ouverture et fermeture,
                        hors récréation et pause de midi.
                    </p>
                </div>
                <ListPage
                    embedded
                    title="Créneaux"
                    icon={Clock}
                    description={`Heures de cours du ${cycleName} utilisées dans l’emploi du temps et les présences.`}
                    searchPlaceholder="Rechercher un créneau..."
                    search={search}
                    onSearchChange={setSearch}
                    actions={
                        <Button type="button" size="sm" onClick={openCreate}>
                            <Plus />
                            Ajouter
                        </Button>
                    }
                    empty={{
                        title: search.trim()
                            ? 'Aucun résultat'
                            : 'Aucun créneau',
                        description: search.trim()
                            ? undefined
                            : 'Ajoutez les heures de cours de la journée.',
                        icon: Clock,
                    }}
                    paging={table}
                    onExport={false}
                >
                    <Table containerClassName={DATA_TABLE_CONTAINER}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <DataTableColumnHeader icon={Hash}>
                                        Code
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Clock}>
                                        Début
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Clock}>
                                        Fin
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Clock}>
                                        Durée
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead className="w-14 text-center">
                                    <DataTableColumnHeader
                                        icon={EllipsisVertical}
                                    >
                                        Actions
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.pageRows.map((period) => {
                                const [startH, startM] = period.startsAt
                                    .split(':')
                                    .map(Number);
                                const [endH, endM] = period.endsAt
                                    .split(':')
                                    .map(Number);
                                const minutes =
                                    (endH ?? 0) * 60 +
                                    (endM ?? 0) -
                                    ((startH ?? 0) * 60 + (startM ?? 0));

                                return (
                                    <TableRow key={period.id}>
                                        <TableCell className="font-medium">
                                            {period.id.toUpperCase()}
                                        </TableCell>
                                        <TableCell>{period.startsAt}</TableCell>
                                        <TableCell>{period.endsAt}</TableCell>
                                        <TableCell>{minutes} min</TableCell>
                                        <TableCell className="px-3 py-1.5 text-center">
                                            <RowMenu
                                                items={crudItems({
                                                    onView: () =>
                                                        setViewing(period),
                                                    onEdit: () =>
                                                        openEdit(period),
                                                    onDelete: () =>
                                                        removePeriod(period),
                                                    deleteDisabled: inUse.has(
                                                        period.id,
                                                    ),
                                                    confirm: {
                                                        title: 'Supprimer le créneau ?',
                                                        description: `${periodLabel(period.id, periods)} ne sera plus proposé dans l’emploi du temps.`,
                                                    },
                                                })}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </ListPage>
            </div>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                icon={Clock}
                title={viewing ? viewing.id.toUpperCase() : 'Créneau'}
                description={
                    viewing
                        ? `${cycleName} · ${periodLabel(viewing.id, periods)}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              { label: 'Cycle', value: cycleName },
                              { label: 'Début', value: viewing.startsAt },
                              { label: 'Fin', value: viewing.endsAt },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier le créneau' : 'Nouveau créneau'}
                description={`Heure de cours du ${cycleName} proposée dans l’emploi du temps.`}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={savingPeriod}
                onSubmit={() => {
                    void savePeriod();
                }}
            >
                <Field
                    id="startsAt"
                    label="Début"
                    required
                    error={errors.startsAt}
                >
                    <TimePicker
                        id="startsAt"
                        value={form.startsAt}
                        onChange={(value) => {
                            clearErrors(['startsAt', 'endsAt']);
                            setForm((current) => ({
                                ...current,
                                startsAt: value,
                            }));
                        }}
                    />
                </Field>
                <Field id="endsAt" label="Fin" required error={errors.endsAt}>
                    <TimePicker
                        id="endsAt"
                        value={form.endsAt}
                        onChange={(value) => {
                            clearErrors('endsAt');
                            setForm((current) => ({
                                ...current,
                                endsAt: value,
                            }));
                        }}
                    />
                </Field>
            </FormSheet>
        </>
    );
}

StructureHoursPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Horaires', href: hoursRoute() },
    ],
};
