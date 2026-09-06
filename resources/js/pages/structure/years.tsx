import { Head } from '@inertiajs/react';
import {
    Calendar,
    CalendarCheck,
    CalendarRange,
    CircleDot,
    EllipsisVertical,
    Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { crudItems } from '@/lib/school-crud';
import { formatFrDate } from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import {
    academicStartYear,
    academicYearLabel,
    buildAcademicYear,
} from '@/lib/school-structure';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyYear,
    store as storeYear,
    update as updateYear,
} from '@/routes/api/v1/academic-years';
import { index as yearsRoute } from '@/routes/structure';
import type { AcademicYear, SchoolDataset, Term } from '@/types/school';

type YearRow = AcademicYear & { terms: Term[] };

const yearSchema = z.object({
    startYear: z.string().refine((value) => {
        const parsed = Number(value);

        return (
            Number.isFinite(parsed) &&
            Number.isInteger(parsed) &&
            parsed >= 2000 &&
            parsed <= 2100
        );
    }, 'Indiquez une année de début valide.'),
});

export default function StructureYearsPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const [search, setSearch] = useState('');
    const [years, setYears] = useState<AcademicYear[]>(catalog.academicYears);
    const [terms, setTerms] = useState<Term[]>(catalog.terms);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<YearRow | null>(null);
    const [startYear, setStartYear] = useState(() => nextStartYear(years));
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...years]
            .sort((left, right) => right.startsOn.localeCompare(left.startsOn))
            .filter((year) =>
                query === ''
                    ? true
                    : `${year.label} ${year.startsOn} ${year.endsOn}`
                          .toLowerCase()
                          .includes(query),
            )
            .map((year) => ({
                ...year,
                terms: terms
                    .filter((term) => term.academicYearId === year.id)
                    .sort((left, right) => left.position - right.position),
            }));
    }, [search, terms, years]);
    const table = useClientTable(rows);

    function openCreate(): void {
        setEditingId(null);
        setStartYear(nextStartYear(years));
        clearErrors();
        setOpen(true);
    }

    function openEdit(year: AcademicYear): void {
        setEditingId(year.id);
        setStartYear(academicStartYear(year));
        clearErrors();
        setOpen(true);
    }

    function duplicate(year: AcademicYear): void {
        setEditingId(null);
        setStartYear(freeStartYear(years, academicStartYear(year) + 1));
        clearErrors();
        setOpen(true);
    }

    async function setAsCurrent(year: AcademicYear): Promise<void> {
        try {
            const saved = await apiData<AcademicYear>(updateYear.url(year.id), {
                method: 'PUT',
                body: { isCurrent: true },
            });

            setYears((current) =>
                current.map((item) => ({
                    ...item,
                    isCurrent: item.id === saved.id,
                })),
            );
            toastSaved(`Année en cours : ${saved.label}`);
        } catch (error) {
            toastApiError(error);
        }
    }

    async function remove(year: AcademicYear): Promise<void> {
        try {
            await apiJson(destroyYear.url(year.id), { method: 'DELETE' });
            setYears((current) =>
                current.filter((item) => item.id !== year.id),
            );
            setTerms((current) =>
                current.filter((term) => term.academicYearId !== year.id),
            );
            toastRemoved(`Année ${year.label} supprimée`);
        } catch (error) {
            toastApiError(error);
        }
    }

    async function saveYear(): Promise<void> {
        if (
            !validate(yearSchema, {
                startYear: Number.isFinite(startYear) ? String(startYear) : '',
            })
        ) {
            return;
        }

        if (
            years.some(
                (year) =>
                    academicStartYear(year) === startYear &&
                    year.id !== editingId,
            )
        ) {
            showErrors({ startYear: 'Cette année scolaire existe déjà.' });

            return;
        }

        const built = buildAcademicYear(startYear);

        setSaving(true);

        try {
            if (editingId === null) {
                const saved = await apiData<AcademicYear & { terms?: Term[] }>(
                    storeYear.url(),
                    {
                        method: 'POST',
                        body: { startYear, withTerms: true },
                    },
                );
                const { terms: createdTerms = [], ...year } = saved;

                setYears((current) => [...current, year]);
                setTerms((current) => [...current, ...createdTerms]);
            } else {
                const id = editingId;
                const saved = await apiData<AcademicYear>(updateYear.url(id), {
                    method: 'PUT',
                    body: {
                        label: built.year.label,
                        startsOn: built.year.startsOn,
                        endsOn: built.year.endsOn,
                    },
                });

                setYears((current) =>
                    current.map((year) => (year.id === id ? saved : year)),
                );
            }

            setOpen(false);
            toastSaved();
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Années scolaires" />
            <ListPage
                embedded
                title="Années scolaires"
                icon={CalendarRange}
                description="Années et trimestres."
                searchPlaceholder="Rechercher une année..."
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
                        : 'Aucune année scolaire',
                    description: search.trim()
                        ? undefined
                        : 'Créez une année scolaire pour ouvrir les inscriptions.',
                    icon: CalendarRange,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={CalendarRange}>
                                    Année
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Période
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Trimestres
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={CircleDot}>
                                    Statut
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
                        {table.pageRows.map((year) => (
                            <TableRow key={year.id}>
                                <TableCell className="font-medium">
                                    {year.label}
                                </TableCell>
                                <TableCell>
                                    {formatFrDate(year.startsOn)} –{' '}
                                    {formatFrDate(year.endsOn)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {year.terms.length === 0
                                            ? '—'
                                            : year.terms.map((term) => (
                                                  <Badge
                                                      key={term.id}
                                                      variant="muted"
                                                  >
                                                      {term.name}
                                                  </Badge>
                                              ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {year.isCurrent ? (
                                        <Badge variant="success">
                                            En cours
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => setViewing(year),
                                            onEdit: () => openEdit(year),
                                            onDuplicate: () => duplicate(year),
                                            onDelete: () => remove(year),
                                            deleteDisabled: year.isCurrent,
                                            confirm: {
                                                title: 'Supprimer l’année scolaire ?',
                                                description: `L’année ${year.label} et ses trimestres seront supprimés.`,
                                            },
                                            extras: [
                                                {
                                                    label: 'Définir comme année en cours',
                                                    icon: CalendarCheck,
                                                    disabled: year.isCurrent,
                                                    onSelect: () =>
                                                        setAsCurrent(year),
                                                },
                                            ],
                                        })}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
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
                icon={CalendarRange}
                title={viewing ? `Année ${viewing.label}` : 'Année scolaire'}
                description={
                    viewing
                        ? `${formatFrDate(viewing.startsOn)} – ${formatFrDate(viewing.endsOn)}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Rentrée',
                                  value: formatFrDate(viewing.startsOn),
                              },
                              {
                                  label: 'Fin d’année',
                                  value: formatFrDate(viewing.endsOn),
                              },
                              {
                                  label: 'Statut',
                                  value: viewing.isCurrent
                                      ? 'Année en cours'
                                      : 'Année inactive',
                              },
                              {
                                  label: 'Trimestres',
                                  value: `${viewing.terms.length} trimestre${viewing.terms.length > 1 ? 's' : ''}`,
                              },
                              {
                                  label: 'Découpage',
                                  value:
                                      viewing.terms.length === 0
                                          ? 'Aucun trimestre défini.'
                                          : viewing.terms
                                                .map(
                                                    (term) =>
                                                        `${term.name} : ${formatFrDate(term.startsOn)} – ${formatFrDate(term.endsOn)}`,
                                                )
                                                .join(' · '),
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    editingId
                        ? 'Modifier l’année scolaire'
                        : 'Nouvelle année scolaire'
                }
                description={
                    editingId
                        ? 'Les dates et les trimestres sont recalculés à partir de l’année de début.'
                        : 'Trois trimestres sont créés automatiquement (septembre à juillet).'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void saveYear();
                }}
            >
                <Field
                    id="startYear"
                    label="Année de début"
                    required
                    error={errors.startYear}
                    hint={`Libellé ${academicYearLabel(startYear)} · 01/09/${startYear} – 15/07/${startYear + 1}.`}
                >
                    <Input
                        id="startYear"
                        type="number"
                        min={2000}
                        max={2100}
                        required
                        value={Number.isFinite(startYear) ? startYear : ''}
                        onChange={(event) => {
                            clearErrors('startYear');
                            setStartYear(Number(event.target.value));
                        }}
                    />
                </Field>
            </FormSheet>
        </>
    );
}

function nextStartYear(years: AcademicYear[]): number {
    const latest = Math.max(
        ...years.map((year) => academicStartYear(year)),
        new Date().getFullYear(),
    );

    return latest + 1;
}

function freeStartYear(years: AcademicYear[], from: number): number {
    let candidate = from;

    while (years.some((year) => academicStartYear(year) === candidate)) {
        candidate += 1;
    }

    return candidate;
}

StructureYearsPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Années', href: yearsRoute() },
    ],
};
