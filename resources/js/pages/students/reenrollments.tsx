import { Head } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle2,
    CircleDot,
    ClipboardCheck,
    EllipsisVertical,
    Plus,
    RefreshCcw,
    School,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { Field } from '@/components/sms/field';
import { FileListField } from '@/components/sms/file-list-field';
import { FormSheet } from '@/components/sms/form-sheet';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchSelect } from '@/components/sms/search-select';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useSchoolContext } from '@/hooks/use-school-context';
import { useCrudItems } from '@/hooks/use-crud-items';
import {
    reenrollmentStatusLabel,
    reenrollmentStatusVariant,
} from '@/lib/school-enrolment';
import {
    requiredDate,
    requiredText,
    studentSchoolSchema,
} from '@/lib/school-form';
import {
    cycleLabel,
    formatFrDate,
    isLyceeCycle,
    studentRows,
    todayIso,
} from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyReenrollment,
    status as updateReenrollmentStatus,
    store as storeReenrollment,
    update as updateReenrollment,
} from '@/routes/api/v1/reenrollments';
import { index as students, reenrollments } from '@/routes/students';
import type {
    DossierFile,
    Reenrollment,
    ReenrollmentStatus,
    SchoolDataset,
} from '@/types/school';

const STATUSES: ReenrollmentStatus[] = [
    'demandee',
    'en_etude',
    'validee',
    'refusee',
];

function reenrollmentSchema(lycee: boolean) {
    return studentSchoolSchema(lycee)
        .omit({ enrolledOn: true })
        .extend({
            studentId: requiredText('L’élève'),
            submittedOn: requiredDate('La date de dépôt'),
        });
}

type ReenrollmentForm = {
    studentId: string;
    previousClass: string;
    classroomId: string;
    trackId: string;
    submittedOn: string;
    status: ReenrollmentStatus;
    notes: string;
};

function blankForm(
    studentId: string,
    previousClass: string,
    classroomId: string,
    trackId: string,
): ReenrollmentForm {
    return {
        studentId,
        previousClass,
        classroomId,
        trackId,
        submittedOn: todayIso(),
        status: 'demandee',
        notes: '',
    };
}

export default function StudentsReenrollments({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const crudItems = useCrudItems();

    const { filter, academicYearLabel } = useSchoolContext();
    const lycee = isLyceeCycle(filter.cycle);
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const tracks = catalog.tracks.filter(
        (track) => track.cycle === filter.cycle,
    );
    const classroomMap = useMemo(
        () => new Map(catalog.classrooms.map((item) => [item.id, item])),
        [catalog.classrooms],
    );
    const pupils = useMemo(
        () => studentRows(catalog, filter),
        [catalog, filter],
    );
    const pupilMap = useMemo(
        () => new Map(pupils.map((row) => [row.studentId, row])),
        [pupils],
    );
    const [items, setItems] = useState<Reenrollment[]>(catalog.reenrollments);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [files, setFiles] = useState<DossierFile[]>([]);
    const firstPupil = pupils[0];
    const [form, setForm] = useState<ReenrollmentForm>(() =>
        blankForm(
            firstPupil?.studentId ?? '',
            firstPupil?.classroom ?? '',
            firstPupil?.classroomId ?? classrooms[0]?.id ?? '',
            firstPupil?.track
                ? (tracks.find((track) => track.code === firstPupil.track)
                      ?.id ?? '')
                : (classrooms[0]?.trackId ?? ''),
        ),
    );
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);

    function patchForm(next: Partial<ReenrollmentForm>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    const scoped = useMemo(
        () =>
            items.filter((item) => {
                if (item.academicYearId !== filter.academicYearId) {
                    return false;
                }

                const classroom = classroomMap.get(item.classroomId);

                return classroom?.cycle === filter.cycle;
            }),
        [classroomMap, filter.academicYearId, filter.cycle, items],
    );
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return scoped.filter((item) => {
            if (statusFilter !== 'all' && item.status !== statusFilter) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            const pupil = pupilMap.get(item.studentId);
            const classroom = classroomMap.get(item.classroomId)?.name ?? '';

            return `${pupil?.lastName ?? ''} ${pupil?.firstName ?? ''} ${pupil?.matricule ?? ''} ${item.previousClass} ${classroom}`
                .toLowerCase()
                .includes(needle);
        });
    }, [classroomMap, pupilMap, scoped, search, statusFilter]);
    const table = useClientTable(rows);
    const stats = useMemo(
        () => ({
            total: scoped.length,
            pending: scoped.filter(
                (item) =>
                    item.status === 'demandee' || item.status === 'en_etude',
            ).length,
            validated: scoped.filter((item) => item.status === 'validee')
                .length,
            refused: scoped.filter((item) => item.status === 'refusee').length,
        }),
        [scoped],
    );

    function applyStudent(studentId: string): void {
        const pupil = pupilMap.get(studentId);
        const classroom = classrooms.find(
            (item) => item.id === pupil?.classroomId,
        );

        patchForm({
            studentId,
            previousClass: pupil?.classroom ?? form.previousClass,
            classroomId: pupil?.classroomId || form.classroomId,
            trackId: classroom?.trackId ?? form.trackId,
        });
    }

    function openCreate(): void {
        const pupil = pupils[0];

        setEditingId(null);
        setForm(
            blankForm(
                pupil?.studentId ?? '',
                pupil?.classroom ?? '',
                pupil?.classroomId ?? classrooms[0]?.id ?? '',
                classrooms.find((item) => item.id === pupil?.classroomId)
                    ?.trackId ??
                    classrooms[0]?.trackId ??
                    '',
            ),
        );
        setFiles([]);
        clearErrors();
        setOpen(true);
    }

    function openEdit(item: Reenrollment): void {
        setEditingId(item.id);
        setForm({
            studentId: item.studentId,
            previousClass: item.previousClass,
            classroomId: item.classroomId,
            trackId: item.trackId ?? '',
            submittedOn: item.submittedOn,
            status: item.status,
            notes: item.notes ?? '',
        });
        setFiles(item.files);
        clearErrors();
        setOpen(true);
    }

    async function patchStatus(
        id: string,
        status: ReenrollmentStatus,
    ): Promise<void> {
        try {
            const saved = await apiData<Reenrollment>(
                updateReenrollmentStatus.url(id),
                { method: 'PATCH', body: { status } },
            );
            setItems((current) =>
                current.map((item) => (item.id === id ? saved : item)),
            );
            toastSaved(
                status === 'validee'
                    ? 'Réinscription validée'
                    : `Dossier ${reenrollmentStatusLabel(status).toLowerCase()}`,
            );
        } catch (error) {
            toastApiError(error);
        }
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyReenrollment.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Dossier retiré');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(reenrollmentSchema(lycee), form)) {
            return;
        }

        const payload = {
            academicYearId: filter.academicYearId,
            studentId: form.studentId,
            previousClass: form.previousClass.trim() || '-',
            classroomId: form.classroomId,
            trackId: lycee ? form.trackId || null : null,
            submittedOn: form.submittedOn,
            notes: form.notes.trim() || null,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Reenrollment>(
                      updateReenrollment.url(editingId),
                      {
                          method: 'PUT',
                          body: payload,
                      },
                  )
                : await apiData<Reenrollment>(storeReenrollment.url(), {
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

    return (
        <>
            <Head title="Réinscriptions" />
            <KpiGrid className="mx-6 my-4">
                <KpiCard
                    icon={RefreshCcw}
                    label="Dossiers"
                    value={String(stats.total)}
                    hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                />
                <KpiCard
                    icon={ClipboardCheck}
                    label="En cours"
                    value={String(stats.pending)}
                    hint="Demandées ou en étude"
                />
                <KpiCard
                    icon={CheckCircle2}
                    label="Validées"
                    value={String(stats.validated)}
                    hint="Places confirmées"
                />
                <KpiCard
                    icon={CircleDot}
                    label="Refusées"
                    value={String(stats.refused)}
                    hint="Non reconduites"
                />
            </KpiGrid>
            <ListPage
                embedded
                title="Réinscriptions"
                icon={RefreshCcw}
                description={`Renouvellements ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                searchPlaceholder="Rechercher un élève, une classe..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <SearchSelect
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                        className="w-[11rem]"
                        aria-label="Filtrer par statut"
                        placeholder="Tous les statuts"
                        searchPlaceholder="Rechercher un statut..."
                        options={[
                            { value: 'all', label: 'Tous les statuts' },
                            ...STATUSES.map((status) => ({
                                value: status,
                                label: reenrollmentStatusLabel(status),
                            })),
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
                    title:
                        search.trim() || statusFilter !== 'all'
                            ? 'Aucun résultat'
                            : 'Aucune réinscription',
                    description:
                        search.trim() || statusFilter !== 'all'
                            ? undefined
                            : `Aucun dossier de réinscription en ${cycleLabel(filter.cycle)} pour ${academicYearLabel}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Élève
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe précédente
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe d’accueil
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Dépôt
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
                        {table.pageRows.map((row) => {
                            const pupil = pupilMap.get(row.studentId);

                            return (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">
                                        {pupil
                                            ? `${pupil.lastName} ${pupil.firstName}`
                                            : '-'}
                                    </TableCell>
                                    <TableCell>{row.previousClass}</TableCell>
                                    <TableCell>
                                        {classroomMap.get(row.classroomId)
                                            ?.name ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                        {formatFrDate(row.submittedOn)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={reenrollmentStatusVariant(
                                                row.status,
                                            )}
                                        >
                                            {reenrollmentStatusLabel(
                                                row.status,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onEdit: () => openEdit(row),
                                                onDelete: () => {
                                                    void remove(row.id);
                                                },
                                                confirm: {
                                                    title: 'Retirer la réinscription ?',
                                                    description: `${pupil?.lastName ?? ''} ${pupil?.firstName ?? ''} disparaîtra du registre des renouvellements.`,
                                                    confirmLabel: 'Retirer',
                                                },
                                                extras: [
                                                    row.status === 'demandee'
                                                        ? {
                                                              label: 'Mettre en étude',
                                                              icon: ClipboardCheck,
                                                              onSelect: () =>
                                                                  void patchStatus(
                                                                      row.id,
                                                                      'en_etude',
                                                                  ),
                                                          }
                                                        : null,
                                                    row.status === 'demandee' ||
                                                    row.status === 'en_etude'
                                                        ? {
                                                              label: 'Valider',
                                                              icon: CheckCircle2,
                                                              onSelect: () =>
                                                                  void patchStatus(
                                                                      row.id,
                                                                      'validee',
                                                                  ),
                                                          }
                                                        : null,
                                                    row.status !== 'refusee' &&
                                                    row.status !== 'validee'
                                                        ? {
                                                              label: 'Refuser',
                                                              icon: CircleDot,
                                                              onSelect: () =>
                                                                  void patchStatus(
                                                                      row.id,
                                                                      'refusee',
                                                                  ),
                                                          }
                                                        : null,
                                                ].filter(
                                                    (
                                                        item,
                                                    ): item is NonNullable<
                                                        typeof item
                                                    > => item !== null,
                                                ),
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </ListPage>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    editingId
                        ? 'Modifier la réinscription'
                        : 'Nouvelle réinscription'
                }
                description={cycleLabel(filter.cycle)}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field
                    id="studentId"
                    label="Élève"
                    required
                    error={errors.studentId}
                >
                    <SearchSelect
                        id="studentId"
                        value={form.studentId}
                        placeholder="Choisir un élève"
                        searchPlaceholder="Rechercher un élève..."
                        options={pupils.map((pupil) => ({
                            value: pupil.studentId,
                            label: `${pupil.lastName} ${pupil.firstName}`,
                            keywords: pupil.matricule,
                        }))}
                        onValueChange={applyStudent}
                    />
                </Field>
                <Field id="previousClass" label="Classe précédente">
                    <Input
                        id="previousClass"
                        value={form.previousClass}
                        onChange={(event) =>
                            patchForm({ previousClass: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="classroomId"
                    label="Classe d’accueil"
                    required
                    error={errors.classroomId}
                >
                    <SearchSelect
                        id="classroomId"
                        value={form.classroomId}
                        placeholder="Choisir une classe"
                        searchPlaceholder="Rechercher une classe..."
                        options={classrooms.map((classroom) => ({
                            value: classroom.id,
                            label: classroom.name,
                        }))}
                        onValueChange={(value) => {
                            const classroom = classrooms.find(
                                (item) => item.id === value,
                            );

                            patchForm({
                                classroomId: value,
                                trackId: classroom?.trackId ?? form.trackId,
                            });
                        }}
                    />
                </Field>
                {lycee ? (
                    <Field
                        id="trackId"
                        label="Série"
                        required
                        error={errors.trackId}
                    >
                        <Select
                            value={form.trackId || undefined}
                            onValueChange={(value) =>
                                patchForm({ trackId: value })
                            }
                        >
                            <SelectTrigger id="trackId">
                                <SelectValue placeholder="Choisir une série" />
                            </SelectTrigger>
                            <SelectContent>
                                {tracks.map((track) => (
                                    <SelectItem key={track.id} value={track.id}>
                                        {track.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                ) : null}
                <Field
                    id="submittedOn"
                    label="Date de dépôt"
                    required
                    error={errors.submittedOn}
                >
                    <DatePicker
                        id="submittedOn"
                        value={form.submittedOn}
                        onChange={(value) => patchForm({ submittedOn: value })}
                    />
                </Field>
                <Field id="status" label="Statut" required>
                    <Select
                        value={form.status}
                        onValueChange={(value) =>
                            patchForm({
                                status: value as ReenrollmentStatus,
                            })
                        }
                    >
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {reenrollmentStatusLabel(status)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="notes" label="Notes">
                    <Textarea
                        id="notes"
                        value={form.notes}
                        rows={3}
                        onChange={(event) =>
                            patchForm({ notes: event.target.value })
                        }
                    />
                </Field>
                <FileListField
                    label="Pièces du dossier"
                    hint="Bulletin, quittance, photos - PDF ou image, 5 Mo maximum."
                    files={files}
                    onChange={setFiles}
                />
            </FormSheet>
        </>
    );
}

StudentsReenrollments.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Réinscriptions', href: reenrollments() },
    ],
};
