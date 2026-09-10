import { Head, router } from '@inertiajs/react';
import {
    BookOpen,
    Calendar,
    ClipboardList,
    Clock,
    EllipsisVertical,
    PenLine,
    Plus,
    School,
    ShieldCheck,
    Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { AssessmentTypeBadge } from '@/components/sms/code-badge';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { FilterMenu } from '@/components/sms/filter-menu';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchSelect } from '@/components/sms/search-select';
import { TimePicker } from '@/components/sms/time-picker';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useSchoolContext } from '@/hooks/use-school-context';
import { useCrudItems } from '@/hooks/use-crud-items';
import { requiredDate, requiredText } from '@/lib/school-form';
import { ASSESSMENT_TYPES, classroomSubjects } from '@/lib/school-grades';
import {
    assessmentRows,
    cycleLabel,
    formatFrDate,
    formatHeldRange,
} from '@/lib/school-rows';
import { assessmentTypeLabel } from '@/lib/school-students';
import {
    defaultHeldUntil,
    timetablePeriodsForClassroom,
} from '@/lib/school-timetable';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyAssessment,
    store as storeAssessment,
    update as updateAssessment,
} from '@/routes/api/v1/assessments';
import { control, devoirs, entry } from '@/routes/assessments';
import type { Assessment, AssessmentType, SchoolDataset } from '@/types/school';

type AssessmentForm = {
    type: AssessmentType;
    name: string;
    classroomId: string;
    subjectId: string;
    termId: string;
    heldOn: string;
    heldAt: string;
    heldUntil: string;
};

const assessmentSchema = z
    .object({
        name: requiredText('Le libellé'),
        classroomId: requiredText('La classe'),
        subjectId: requiredText('La matière'),
        termId: requiredText('Le trimestre'),
        heldOn: requiredDate('La date'),
        heldAt: requiredText('L’heure de début'),
        heldUntil: requiredText('L’heure de fin'),
    })
    .refine((data) => data.heldUntil > data.heldAt, {
        message: 'L’heure de fin doit être après l’heure de début.',
        path: ['heldUntil'],
    });

function blankForm(
    classrooms: SchoolDataset['classrooms'],
    terms: SchoolDataset['terms'],
    catalog: SchoolDataset,
    lockedType?: AssessmentType,
): AssessmentForm {
    const periods = timetablePeriodsForClassroom(
        catalog,
        classrooms[0]?.id ?? '',
    );
    const type = lockedType ?? 'devoir';
    const heldAt = periods[1]?.startsAt ?? periods[0]?.startsAt ?? '08:25';

    return {
        type,
        name: '',
        classroomId: classrooms[0]?.id ?? '',
        subjectId: '',
        termId: terms[0]?.id ?? '',
        heldOn: '',
        heldAt,
        heldUntil: defaultHeldUntil(heldAt, type, periods),
    };
}

function lockedTypeTitle(type: AssessmentType): string {
    switch (type) {
        case 'devoir':
            return 'Devoirs';
        case 'composition':
            return 'Compositions';
        case 'examen':
            return 'Examens';
    }
}

export default function AssessmentsIndex({
    catalog,
    lockedType,
}: {
    catalog: SchoolDataset;
    lockedType?: AssessmentType;
}) {
    const crudItems = useCrudItems();

    const { filter, query, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | AssessmentType>(
        lockedType ?? 'all',
    );
    const [classroomId, setClassroomId] = useState('all');
    const [subjectId, setSubjectId] = useState('all');
    const [termFilter, setTermFilter] = useState('all');
    const [items, setItems] = useState<Assessment[]>(catalog.assessments);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<
        ReturnType<typeof assessmentRows>[number] | null
    >(null);
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const terms = catalog.terms.filter(
        (term) => term.academicYearId === filter.academicYearId,
    );
    const [form, setForm] = useState<AssessmentForm>(() =>
        blankForm(classrooms, terms, catalog, lockedType),
    );
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const selectedClassroom = classrooms.find(
        (classroom) => classroom.id === form.classroomId,
    );
    const subjects = selectedClassroom
        ? classroomSubjects(catalog, selectedClassroom)
        : [];
    const periods = timetablePeriodsForClassroom(
        catalog,
        form.classroomId || classrooms[0]?.id || '',
    );
    const cycleSubjects = useMemo(() => {
        const allowed = new Set(
            classrooms.flatMap((classroom) =>
                classroomSubjects(catalog, classroom).map(
                    (subject) => subject.id,
                ),
            ),
        );

        return catalog.subjects.filter((subject) => allowed.has(subject.id));
    }, [catalog, classrooms]);
    const working = useMemo(
        () => ({ ...catalog, assessments: items }),
        [catalog, items],
    );
    const filtered =
        (!lockedType && typeFilter !== 'all') ||
        classroomId !== 'all' ||
        subjectId !== 'all' ||
        termFilter !== 'all' ||
        search.trim() !== '';
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const effectiveType = lockedType ?? typeFilter;

        return assessmentRows(working, filter).filter((row) => {
            if (effectiveType !== 'all' && row.type !== effectiveType) {
                return false;
            }

            if (classroomId !== 'all' && row.classroomId !== classroomId) {
                return false;
            }

            if (subjectId !== 'all' && row.subjectId !== subjectId) {
                return false;
            }

            if (termFilter !== 'all' && row.termId !== termFilter) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return `${row.name} ${assessmentTypeLabel(row.type)} ${row.classroom} ${row.subject} ${row.term} ${formatFrDate(row.heldOn)}`
                .toLowerCase()
                .includes(needle);
        });
    }, [
        classroomId,
        filter,
        lockedType,
        search,
        subjectId,
        termFilter,
        typeFilter,
        working,
    ]);
    const table = useClientTable(rows);
    const listTitle = lockedType
        ? lockedTypeTitle(lockedType)
        : 'Évaluations';

    function openCreate(): void {
        setEditingId(null);
        setForm(blankForm(classrooms, terms, catalog, lockedType));
        clearErrors();
        setOpen(true);
    }

    function openEdit(row: Assessment): void {
        setEditingId(row.id);
        setForm({
            type: lockedType ?? row.type,
            name: row.name,
            classroomId: row.classroomId,
            subjectId: row.subjectId,
            termId: row.termId,
            heldOn: row.heldOn,
            heldAt: row.heldAt,
            heldUntil: row.heldUntil,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicate(row: Assessment): void {
        setEditingId(null);
        setForm({
            type: lockedType ?? row.type,
            name: `${row.name} (copie)`,
            classroomId: row.classroomId,
            subjectId: row.subjectId,
            termId: row.termId,
            heldOn: row.heldOn,
            heldAt: row.heldAt,
            heldUntil: row.heldUntil,
        });
        clearErrors();
        setOpen(true);
    }

    function patchForm(next: Partial<AssessmentForm>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyAssessment.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Évaluation supprimée');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(assessmentSchema, form)) {
            return;
        }

        const payload = {
            type: lockedType ?? form.type,
            name: form.name.trim(),
            classroomId: form.classroomId,
            subjectId: form.subjectId,
            termId: form.termId,
            heldOn: form.heldOn,
            heldAt: form.heldAt,
            heldUntil: form.heldUntil,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Assessment>(updateAssessment.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Assessment>(storeAssessment.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setItems((current) =>
                editingId
                    ? current.map((item) =>
                          item.id === editingId ? saved : item,
                      )
                    : [saved, ...current],
            );
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

    function openGrid(
        path: typeof entry | typeof control,
        row: (typeof rows)[number],
    ): void {
        router.visit(
            path({
                query: {
                    ...query,
                    classe: row.classroomId,
                    evaluation: row.id,
                },
            }),
        );
    }

    return (
        <>
            <Head title={listTitle} />
            <ListPage
                embedded
                title={listTitle}
                icon={ClipboardList}
                description={`${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                searchPlaceholder="Rechercher une évaluation, une classe, une matière..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <FilterMenu
                        groups={[
                            ...(lockedType
                                ? []
                                : [
                                      {
                                          id: 'type',
                                          label: 'Type',
                                          icon: Tag,
                                          value: typeFilter,
                                          onChange: (value: string) =>
                                              setTypeFilter(
                                                  value as
                                                      | 'all'
                                                      | AssessmentType,
                                              ),
                                          options: [
                                              {
                                                  value: 'all',
                                                  label: 'Tous les types',
                                              },
                                              ...ASSESSMENT_TYPES.map(
                                                  (type) => ({
                                                      value: type,
                                                      label: assessmentTypeLabel(
                                                          type,
                                                      ),
                                                  }),
                                              ),
                                          ],
                                      },
                                  ]),
                            {
                                id: 'classroom',
                                label: 'Classe',
                                icon: School,
                                value: classroomId,
                                onChange: setClassroomId,
                                options: [
                                    {
                                        value: 'all',
                                        label: 'Toutes les classes',
                                    },
                                    ...classrooms.map((classroom) => ({
                                        value: classroom.id,
                                        label: classroom.name,
                                    })),
                                ],
                            },
                            {
                                id: 'subject',
                                label: 'Matière',
                                icon: BookOpen,
                                value: subjectId,
                                onChange: setSubjectId,
                                options: [
                                    {
                                        value: 'all',
                                        label: 'Toutes les matières',
                                    },
                                    ...cycleSubjects.map((subject) => ({
                                        value: subject.id,
                                        label: subject.name,
                                    })),
                                ],
                            },
                            {
                                id: 'term',
                                label: 'Trimestre',
                                icon: Calendar,
                                value: termFilter,
                                onChange: setTermFilter,
                                options: [
                                    {
                                        value: 'all',
                                        label: 'Tous les trimestres',
                                    },
                                    ...terms.map((term) => ({
                                        value: term.id,
                                        label: term.name,
                                    })),
                                ],
                            },
                        ]}
                    />
                }
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Ajouter
                    </Button>
                }
                empty={{
                    title: filtered
                        ? 'Aucun résultat'
                        : 'Aucune évaluation dans ce cycle',
                    description: filtered
                        ? undefined
                        : `Aucune évaluation en ${cycleLabel(filter.cycle)}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={ClipboardList}>
                                    Évaluation
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Tag}>
                                    Type
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={BookOpen}>
                                    Matière
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Trimestre
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Clock}>
                                    Date et heure
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
                        {table.pageRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                    {row.name}
                                </TableCell>
                                <TableCell>
                                    <AssessmentTypeBadge type={row.type} />
                                </TableCell>
                                <TableCell>{row.classroom}</TableCell>
                                <TableCell>{row.subject}</TableCell>
                                <TableCell>{row.term}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatFrDate(row.heldOn)} ·{' '}
                                    {formatHeldRange(row.heldAt, row.heldUntil)}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => setViewing(row),
                                            onEdit: () => openEdit(row),
                                            onDuplicate: () => duplicate(row),
                                            onDelete: () => {
                                                void remove(row.id);
                                            },
                                            confirm: {
                                                title: 'Supprimer l’évaluation ?',
                                                description: `${row.subject} du ${formatFrDate(row.heldOn)} sera supprimée, avec les notes saisies.`,
                                            },
                                            extras: [
                                                {
                                                    label: 'Saisir les notes',
                                                    icon: PenLine,
                                                    disabled:
                                                        row.id.startsWith(
                                                            'as-local-',
                                                        ),
                                                    onSelect: () =>
                                                        openGrid(entry, row),
                                                },
                                                {
                                                    label: 'Contrôler',
                                                    icon: ShieldCheck,
                                                    disabled:
                                                        row.id.startsWith(
                                                            'as-local-',
                                                        ),
                                                    onSelect: () =>
                                                        openGrid(control, row),
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
                icon={ClipboardList}
                title={viewing?.name ?? 'Évaluation'}
                description={
                    viewing
                        ? `${viewing.classroom} · ${viewing.subject}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Type',
                                  value: (
                                      <AssessmentTypeBadge
                                          type={viewing.type}
                                      />
                                  ),
                              },
                              {
                                  label: 'Trimestre',
                                  value: viewing.term,
                              },
                              {
                                  label: 'Date',
                                  value: formatFrDate(viewing.heldOn),
                              },
                              {
                                  label: 'Créneau',
                                  value: formatHeldRange(
                                      viewing.heldAt,
                                      viewing.heldUntil,
                                  ),
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
                        ? lockedType === 'devoir'
                            ? 'Modifier le devoir'
                            : lockedType === 'composition'
                              ? 'Modifier la composition'
                              : lockedType === 'examen'
                                ? 'Modifier l’examen'
                                : 'Modifier l’évaluation'
                        : lockedType === 'devoir'
                          ? 'Nouveau devoir'
                          : lockedType === 'composition'
                            ? 'Nouvelle composition'
                            : lockedType === 'examen'
                              ? 'Nouvel examen'
                              : 'Nouvelle évaluation'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                {lockedType ? null : (
                    <Field
                        id="type"
                        label="Type"
                        required
                        hint="Devoir, composition ou examen."
                    >
                        <Select
                            value={form.type}
                            onValueChange={(value) => {
                                const type = value as AssessmentType;

                                clearErrors(['type', 'heldUntil']);
                                setForm((current) => ({
                                    ...current,
                                    type,
                                    heldUntil: defaultHeldUntil(
                                        current.heldAt,
                                        type,
                                        periods,
                                    ),
                                }));
                            }}
                        >
                            <SelectTrigger id="type" className="w-full">
                                <SelectValue placeholder="Choisir un type" />
                            </SelectTrigger>
                            <SelectContent>
                                {ASSESSMENT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        <AssessmentTypeBadge type={type} />
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                )}
                <Field id="name" label="Libellé" required error={errors.name}>
                    <Input
                        id="name"
                        value={form.name}
                        required
                        onChange={(event) =>
                            patchForm({ name: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="classroomId"
                    label="Classe"
                    required
                    error={errors.classroomId}
                >
                    <SearchSelect
                        id="classroomId"
                        className="w-full"
                        value={form.classroomId}
                        placeholder="Choisir une classe"
                        searchPlaceholder="Rechercher une classe..."
                        options={classrooms.map((classroom) => ({
                            value: classroom.id,
                            label: classroom.name,
                        }))}
                        onValueChange={(value) =>
                            patchForm({ classroomId: value, subjectId: '' })
                        }
                    />
                </Field>
                <Field
                    id="subjectId"
                    label="Matière"
                    required
                    error={errors.subjectId}
                >
                    <SearchSelect
                        id="subjectId"
                        className="w-full"
                        value={form.subjectId}
                        placeholder="Choisir une matière"
                        searchPlaceholder="Rechercher une matière..."
                        options={subjects.map((subject) => ({
                            value: subject.id,
                            label: `${subject.code} - ${subject.name}`,
                        }))}
                        onValueChange={(value) =>
                            patchForm({ subjectId: value })
                        }
                    />
                </Field>
                <Field
                    id="termId"
                    label="Trimestre"
                    required
                    error={errors.termId}
                >
                    <Select
                        value={form.termId || undefined}
                        onValueChange={(value) => patchForm({ termId: value })}
                    >
                        <SelectTrigger id="termId" className="w-full">
                            <SelectValue placeholder="Choisir un trimestre" />
                        </SelectTrigger>
                        <SelectContent>
                            {terms.map((term) => (
                                <SelectItem key={term.id} value={term.id}>
                                    {term.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="heldOn" label="Date" required error={errors.heldOn}>
                    <DatePicker
                        id="heldOn"
                        value={form.heldOn}
                        required
                        onChange={(value) => patchForm({ heldOn: value })}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        id="heldAt"
                        label="Début"
                        required
                        error={errors.heldAt}
                    >
                        <TimePicker
                            id="heldAt"
                            value={form.heldAt}
                            onChange={(value) => {
                                clearErrors(['heldAt', 'heldUntil']);
                                setForm((current) => ({
                                    ...current,
                                    heldAt: value,
                                    heldUntil: defaultHeldUntil(
                                        value,
                                        current.type,
                                        periods,
                                    ),
                                }));
                            }}
                        />
                    </Field>
                    <Field
                        id="heldUntil"
                        label="Fin"
                        required
                        error={errors.heldUntil}
                    >
                        <TimePicker
                            id="heldUntil"
                            value={form.heldUntil}
                            onChange={(value) =>
                                patchForm({ heldUntil: value })
                            }
                        />
                    </Field>
                </div>
                <p className="text-muted-foreground text-[13px]">
                    Créneau visible sur l’emploi du temps de la classe.
                </p>
            </FormSheet>
        </>
    );
}

AssessmentsIndex.layout = {
    breadcrumbs: [{ title: 'Évaluations', href: devoirs() }],
};
