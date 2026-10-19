import { Head } from '@inertiajs/react';
import { Clock, EllipsisVertical, Hash, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { CodeBadge } from '@/components/sms/code-badge';
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
import { Badge } from '@/components/ui/badge';
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
import { useCycleSchedules } from '@/hooks/use-cycle-schedules';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { requiredText } from '@/lib/school-form';
import { cycleLabel } from '@/lib/school-rows';
import {
    periodFitsHours,
    periodLabel,
    periodsOverlap,
} from '@/lib/school-timetable';
import { toastRemoved } from '@/lib/school-toast';
import {
    index as yearsRoute,
    periods as periodsRoute,
} from '@/routes/structure';
import type { SchoolDataset, TimetablePeriod } from '@/types/school';

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

function periodDurationMinutes(period: TimetablePeriod): number {
    const [startH, startM] = period.startsAt.split(':').map(Number);
    const [endH, endM] = period.endsAt.split(':').map(Number);

    return (
        (endH ?? 0) * 60 +
        (endM ?? 0) -
        ((startH ?? 0) * 60 + (startM ?? 0))
    );
}

export default function StructurePeriodsPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const crudItems = useCrudItems();
    const { filter } = useSchoolContext();
    const cycle = filter.cycle;
    const cycleName = cycleLabel(cycle);
    const { schedule, persistSchedule } = useCycleSchedules(catalog, cycle);
    const hours = schedule.hours;
    const periods = schedule.periods;
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState<TimetablePeriod | null>(null);
    const [savingPeriod, setSavingPeriod] = useState(false);
    const { errors, clearErrors, showErrors, validate } = useFieldErrors();
    const [form, setForm] = useState<PeriodForm>({
        startsAt: hours.startsAt,
        endsAt: addMinutes(hours.startsAt, 30),
    });

    useEffect(() => {
        setOpen(false);
        setViewing(null);
        setSearch('');
        clearErrors();
    }, [cycle]);

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

    async function savePeriod(): Promise<void> {
        if (!validate(periodSchema, form)) {
            return;
        }

        const draft = {
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
            startsAt: form.startsAt,
            endsAt: form.endsAt,
        };
        const nextPeriods = editingId
            ? periods.map((item) => (item.id === editingId ? payload : item))
            : [...periods, payload];

        setSavingPeriod(true);

        try {
            const ok = await persistSchedule(
                { ...schedule, periods: nextPeriods },
                undefined,
                showErrors,
            );

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
            showErrors,
        );

        if (ok) {
            toastRemoved(`Créneau ${label} supprimé`);
        }
    }

    return (
        <>
            <Head title="Créneaux" />
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
                                <DataTableColumnHeader icon={EllipsisVertical}>
                                    Actions
                                </DataTableColumnHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((period) => {
                            const minutes = periodDurationMinutes(period);

                            return (
                                <TableRow key={period.id}>
                                    <TableCell>
                                        <CodeBadge>
                                            {period.id.toUpperCase()}
                                        </CodeBadge>
                                    </TableCell>
                                    <TableCell className="font-medium tabular-nums">
                                        {period.startsAt}
                                    </TableCell>
                                    <TableCell className="font-medium tabular-nums">
                                        {period.endsAt}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="muted">
                                            {Number.isFinite(minutes)
                                                ? `${minutes} min`
                                                : '—'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onView: () =>
                                                    setViewing(period),
                                                onEdit: () => openEdit(period),
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
                <Field
                    id="endsAt"
                    label="Fin"
                    required
                    error={errors.endsAt}
                >
                    <TimePicker
                        id="endsAt"
                        value={form.endsAt}
                        onChange={(value) => {
                            clearErrors(['startsAt', 'endsAt']);
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

StructurePeriodsPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Créneaux', href: periodsRoute() },
    ],
};
