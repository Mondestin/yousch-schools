import { Head } from '@inertiajs/react';
import {
    Calendar,
    CircleDot,
    ClipboardCheck,
    EllipsisVertical,
    Inbox,
    Plus,
    School,
    User,
    UserPlus,
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
import { GenderSelect } from '@/components/sms/gender-select';
import { KpiCard } from '@/components/sms/kpi-card';
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
import { crudItems } from '@/lib/school-crud';
import {
    admissionStatusLabel,
    admissionStatusVariant,
} from '@/lib/school-enrolment';
import {
    requiredDate,
    requiredText,
    studentIdentitySchema,
    studentSchoolSchema,
} from '@/lib/school-form';
import {
    cycleLabel,
    formatFrDate,
    isLyceeCycle,
    todayIso,
} from '@/lib/school-rows';
import { guardianRelationLabel } from '@/lib/school-students';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyAdmission,
    status as updateAdmissionStatus,
    store as storeAdmission,
    update as updateAdmission,
} from '@/routes/api/v1/admissions';
import { admissions, index as students } from '@/routes/students';
import type {
    AdmissionApplication,
    AdmissionStatus,
    DossierFile,
    Gender,
    GuardianRelation,
    SchoolDataset,
} from '@/types/school';

const RELATIONS: GuardianRelation[] = [
    'pere',
    'mere',
    'tuteur',
    'oncle',
    'tante',
    'autre',
];

const STATUSES: AdmissionStatus[] = [
    'recue',
    'en_etude',
    'acceptee',
    'refusee',
    'inscrit',
];

function admissionSchema(lycee: boolean) {
    return studentIdentitySchema.merge(
        studentSchoolSchema(lycee)
            .omit({ enrolledOn: true })
            .extend({
                city: requiredText('La ville'),
                neighborhood: requiredText('Le quartier'),
                guardianLastName: requiredText('Le nom'),
                guardianFirstName: requiredText('Le prénom'),
                guardianPhone: requiredText('Le téléphone'),
                submittedOn: requiredDate('La date de dépôt'),
            }),
    );
}

type AdmissionForm = {
    lastName: string;
    firstName: string;
    gender: Gender;
    bornOn: string;
    city: string;
    neighborhood: string;
    address: string;
    phone: string;
    classroomId: string;
    trackId: string;
    guardianLastName: string;
    guardianFirstName: string;
    guardianPhone: string;
    guardianRelation: GuardianRelation;
    notes: string;
    submittedOn: string;
    status: AdmissionStatus;
};

function blankForm(
    classroomId: string,
    trackId: string,
    city: string,
): AdmissionForm {
    return {
        lastName: '',
        firstName: '',
        gender: 'femme',
        bornOn: '',
        city,
        neighborhood: '',
        address: '',
        phone: '',
        classroomId,
        trackId,
        guardianLastName: '',
        guardianFirstName: '',
        guardianPhone: '',
        guardianRelation: 'pere',
        notes: '',
        submittedOn: todayIso(),
        status: 'recue',
    };
}

export default function StudentsAdmissions({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
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
    const [items, setItems] = useState<AdmissionApplication[]>(
        catalog.admissions,
    );
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [files, setFiles] = useState<DossierFile[]>([]);
    const [form, setForm] = useState<AdmissionForm>(() =>
        blankForm(
            classrooms[0]?.id ?? '',
            classrooms[0]?.trackId ?? tracks[0]?.id ?? '',
            catalog.profile.city,
        ),
    );
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);

    function patchForm(next: Partial<AdmissionForm>): void {
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

            const classroom = classroomMap.get(item.classroomId)?.name ?? '';

            return `${item.lastName} ${item.firstName} ${item.guardianLastName} ${item.guardianPhone} ${classroom}`
                .toLowerCase()
                .includes(needle);
        });
    }, [classroomMap, scoped, search, statusFilter]);
    const table = useClientTable(rows);
    const stats = useMemo(
        () => ({
            total: scoped.length,
            study: scoped.filter((item) => item.status === 'en_etude').length,
            accepted: scoped.filter((item) => item.status === 'acceptee')
                .length,
            enrolled: scoped.filter((item) => item.status === 'inscrit').length,
        }),
        [scoped],
    );

    function openCreate(): void {
        setEditingId(null);
        setForm(
            blankForm(
                classrooms[0]?.id ?? '',
                classrooms[0]?.trackId ?? tracks[0]?.id ?? '',
                catalog.profile.city,
            ),
        );
        setFiles([]);
        clearErrors();
        setOpen(true);
    }

    function openEdit(item: AdmissionApplication): void {
        setEditingId(item.id);
        setForm({
            lastName: item.lastName,
            firstName: item.firstName,
            gender: item.gender,
            bornOn: item.bornOn,
            city: item.city,
            neighborhood: item.neighborhood,
            address: item.address ?? '',
            phone: item.phone ?? '',
            classroomId: item.classroomId,
            trackId: item.trackId ?? '',
            guardianLastName: item.guardianLastName,
            guardianFirstName: item.guardianFirstName,
            guardianPhone: item.guardianPhone,
            guardianRelation: item.guardianRelation,
            notes: item.notes ?? '',
            submittedOn: item.submittedOn,
            status: item.status,
        });
        setFiles(item.files);
        clearErrors();
        setOpen(true);
    }

    async function patchStatus(
        id: string,
        status: AdmissionStatus,
    ): Promise<void> {
        try {
            const saved = await apiData<AdmissionApplication>(
                updateAdmissionStatus.url(id),
                { method: 'PATCH', body: { status } },
            );
            setItems((current) =>
                current.map((item) => (item.id === id ? saved : item)),
            );
            toastSaved(
                status === 'inscrit'
                    ? 'Élève inscrit'
                    : `Demande ${admissionStatusLabel(status).toLowerCase()}`,
            );
        } catch (error) {
            toastApiError(error);
        }
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyAdmission.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Demande retirée');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(admissionSchema(lycee), form)) {
            return;
        }

        const payload = {
            academicYearId: filter.academicYearId,
            cycle: filter.cycle,
            classroomId: form.classroomId,
            trackId: lycee ? form.trackId || null : null,
            submittedOn: form.submittedOn,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            gender: form.gender,
            bornOn: form.bornOn,
            city: form.city.trim(),
            neighborhood: form.neighborhood.trim(),
            address: form.address.trim() || null,
            phone: form.phone.trim() || null,
            guardianLastName: form.guardianLastName.trim(),
            guardianFirstName: form.guardianFirstName.trim(),
            guardianPhone: form.guardianPhone.trim(),
            guardianRelation: form.guardianRelation,
            notes: form.notes.trim() || null,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<AdmissionApplication>(
                      updateAdmission.url(editingId),
                      { method: 'PUT', body: payload },
                  )
                : await apiData<AdmissionApplication>(storeAdmission.url(), {
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
            <Head title="Demandes d’admission" />
            <div className="grid gap-3 px-6 py-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    icon={Inbox}
                    label="Demandes"
                    value={String(stats.total)}
                    hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                />
                <KpiCard
                    icon={ClipboardCheck}
                    label="En étude"
                    value={String(stats.study)}
                    hint="Dossiers à examiner"
                />
                <KpiCard
                    icon={UserPlus}
                    label="Acceptées"
                    value={String(stats.accepted)}
                    hint="Prêtes à inscrire"
                />
                <KpiCard
                    icon={User}
                    label="Inscrites"
                    value={String(stats.enrolled)}
                    hint="Devenues élèves"
                />
            </div>
            <ListPage
                embedded
                title="Demandes d’admission"
                icon={UserPlus}
                description={`Candidatures ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                searchPlaceholder="Rechercher nom, tuteur, classe..."
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
                                label: admissionStatusLabel(status),
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
                            : 'Aucune demande d’admission',
                    description:
                        search.trim() || statusFilter !== 'all'
                            ? undefined
                            : `Aucune candidature en ${cycleLabel(filter.cycle)} pour ${academicYearLabel}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Candidat
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe demandée
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Tuteur
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
                        {table.pageRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                    {row.lastName} {row.firstName}
                                </TableCell>
                                <TableCell>
                                    {classroomMap.get(row.classroomId)?.name ??
                                        '—'}
                                </TableCell>
                                <TableCell>
                                    {row.guardianLastName}{' '}
                                    {row.guardianFirstName}
                                </TableCell>
                                <TableCell>
                                    {formatFrDate(row.submittedOn)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={admissionStatusVariant(
                                            row.status,
                                        )}
                                    >
                                        {admissionStatusLabel(row.status)}
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
                                                title: 'Retirer la demande ?',
                                                description: `${row.lastName} ${row.firstName} disparaîtra du registre des admissions.`,
                                                confirmLabel: 'Retirer',
                                            },
                                            extras: [
                                                row.status === 'recue'
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
                                                row.status === 'en_etude' ||
                                                row.status === 'recue'
                                                    ? {
                                                          label: 'Accepter',
                                                          icon: UserPlus,
                                                          onSelect: () =>
                                                              void patchStatus(
                                                                  row.id,
                                                                  'acceptee',
                                                              ),
                                                      }
                                                    : null,
                                                row.status === 'acceptee'
                                                    ? {
                                                          label: 'Inscrire',
                                                          icon: User,
                                                          onSelect: () =>
                                                              void patchStatus(
                                                                  row.id,
                                                                  'inscrit',
                                                              ),
                                                      }
                                                    : null,
                                                row.status !== 'refusee' &&
                                                row.status !== 'inscrit'
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
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    editingId
                        ? 'Modifier la demande'
                        : 'Nouvelle demande d’admission'
                }
                description={cycleLabel(filter.cycle)}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field
                    id="lastName"
                    label="Nom"
                    required
                    error={errors.lastName}
                >
                    <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(event) =>
                            patchForm({ lastName: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="firstName"
                    label="Prénom"
                    required
                    error={errors.firstName}
                >
                    <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(event) =>
                            patchForm({ firstName: event.target.value })
                        }
                    />
                </Field>
                <GenderSelect
                    value={form.gender}
                    required
                    error={errors.gender}
                    onChange={(value) => patchForm({ gender: value })}
                />
                <Field
                    id="bornOn"
                    label="Date de naissance"
                    required
                    error={errors.bornOn}
                >
                    <DatePicker
                        id="bornOn"
                        value={form.bornOn}
                        onChange={(value) => patchForm({ bornOn: value })}
                    />
                </Field>
                <Field id="city" label="Ville" required error={errors.city}>
                    <Input
                        id="city"
                        value={form.city}
                        onChange={(event) =>
                            patchForm({ city: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="neighborhood"
                    label="Quartier"
                    required
                    error={errors.neighborhood}
                >
                    <Input
                        id="neighborhood"
                        value={form.neighborhood}
                        onChange={(event) =>
                            patchForm({ neighborhood: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="classroomId"
                    label="Classe demandée"
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
                    id="guardianLastName"
                    label="Nom du tuteur"
                    required
                    error={errors.guardianLastName}
                >
                    <Input
                        id="guardianLastName"
                        value={form.guardianLastName}
                        onChange={(event) =>
                            patchForm({
                                guardianLastName: event.target.value,
                            })
                        }
                    />
                </Field>
                <Field
                    id="guardianFirstName"
                    label="Prénom du tuteur"
                    required
                    error={errors.guardianFirstName}
                >
                    <Input
                        id="guardianFirstName"
                        value={form.guardianFirstName}
                        onChange={(event) =>
                            patchForm({
                                guardianFirstName: event.target.value,
                            })
                        }
                    />
                </Field>
                <Field
                    id="guardianPhone"
                    label="Téléphone du tuteur"
                    required
                    error={errors.guardianPhone}
                >
                    <Input
                        id="guardianPhone"
                        value={form.guardianPhone}
                        onChange={(event) =>
                            patchForm({ guardianPhone: event.target.value })
                        }
                    />
                </Field>
                <Field id="guardianRelation" label="Lien" required>
                    <Select
                        value={form.guardianRelation}
                        onValueChange={(value) =>
                            patchForm({
                                guardianRelation: value as GuardianRelation,
                            })
                        }
                    >
                        <SelectTrigger id="guardianRelation">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RELATIONS.map((relation) => (
                                <SelectItem key={relation} value={relation}>
                                    {guardianRelationLabel(relation)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
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
                            patchForm({ status: value as AdmissionStatus })
                        }
                    >
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {admissionStatusLabel(status)}
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
                    hint="Extrait de naissance, photos, carnet — PDF ou image, 5 Mo maximum."
                    files={files}
                    onChange={setFiles}
                />
            </FormSheet>
        </>
    );
}

StudentsAdmissions.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Admissions', href: admissions() },
    ],
};
