import { Head, Link, router } from '@inertiajs/react';
import {
    Briefcase,
    CircleDot,
    EllipsisVertical,
    Hash,
    Phone,
    Plus,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { FormSheet } from '@/components/sms/form-sheet';
import { FormStepActions, FormSteps } from '@/components/sms/form-steps';
import { FileListField } from '@/components/sms/file-list-field';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import {
    TEACHER_FORM_STEPS,
    TeacherFormFields,
    blankTeacherForm,
    teacherFormSchema,
    teacherFromForm,
    teacherSectionValid,
    teacherStepSchema,
    teacherToForm,
} from '@/components/sms/teacher-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PersonCell } from '@/components/sms/person-cell';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { crudItems } from '@/lib/school-crud';
import { dossierFilesOf } from '@/lib/school-files';
import { cycleLabel } from '@/lib/school-rows';
import {
    nextTeacherCode,
    teacherRows,
    teacherStatusLabel,
} from '@/lib/school-staff';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyTeacher,
    store as storeTeacher,
    update as updateTeacher,
} from '@/routes/api/v1/teachers';
import { index as teachers, create, show } from '@/routes/teachers';
import type { DossierFile, SchoolDataset, Teacher } from '@/types/school';

export default function TeachersIndex({ catalog }: { catalog: SchoolDataset }) {
    const { filter, query, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<Teacher[]>(catalog.teachers);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(() =>
        blankTeacherForm(nextTeacherCode(catalog), catalog.profile.city),
    );
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [files, setFiles] = useState<DossierFile[]>([]);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const working = useMemo(
        () => ({ ...catalog, teachers: items }),
        [catalog, items],
    );
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return teacherRows(working, filter).filter((row) =>
            needle === ''
                ? true
                : `${row.code} ${row.lastName} ${row.firstName} ${row.phone}`
                      .toLowerCase()
                      .includes(needle),
        );
    }, [filter, search, working]);
    const table = useClientTable(rows);

    function openEdit(id: string): void {
        const teacher = items.find((item) => item.id === id);

        if (!teacher) {
            return;
        }

        setEditingId(id);
        setForm(teacherToForm(teacher));
        setPhotoPreview(teacher.photoUrl);
        setFiles(dossierFilesOf(teacher));
        setStep(0);
        clearErrors();
        setOpen(true);
    }

    function duplicate(id: string): void {
        const teacher = items.find((item) => item.id === id);

        if (!teacher) {
            return;
        }

        setEditingId(null);
        setForm({
            ...teacherToForm(teacher),
            code: nextTeacherCode(working),
            lastName: '',
            firstName: '',
        });
        setPhotoPreview(null);
        setFiles([]);
        setStep(0);
        clearErrors();
        setOpen(true);
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyTeacher.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Enseignant retiré');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(teacherFormSchema, form)) {
            return;
        }

        const payload = {
            ...teacherFromForm(form),
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Teacher>(updateTeacher.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Teacher>(storeTeacher.url(), {
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
            <Head title="Enseignants" />
            <ListPage
                title="Enseignants"
                icon={Briefcase}
                description={`Affectations ${cycleLabel(filter.cycle)} · ${academicYearLabel}. Un enseignant peut enseigner plusieurs matières.`}
                searchPlaceholder="Rechercher nom, matricule, téléphone..."
                search={search}
                onSearchChange={setSearch}
                actions={
                    <Button type="button" size="sm" asChild>
                        <Link href={create({ query })}>
                            <Plus />
                            Ajouter
                        </Link>
                    </Button>
                }
                empty={{
                    title: search.trim()
                        ? 'Aucun résultat'
                        : 'Aucun enseignant dans ce cycle',
                    description: search.trim()
                        ? undefined
                        : `Aucun enseignant affecté en ${cycleLabel(filter.cycle)}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    Matricule
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Nom
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Prénom
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Phone}>
                                    Téléphone
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
                                <TableCell>
                                    {row.id.startsWith('tc-local-') ? (
                                        <Badge variant="code">{row.code}</Badge>
                                    ) : (
                                        <Link
                                            href={show(row.id, { query })}
                                            className="hover:text-primary"
                                        >
                                            <Badge variant="code">
                                                {row.code}
                                            </Badge>
                                        </Link>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <PersonCell
                                        name={row.name}
                                        label={row.lastName}
                                        photoUrl={row.photoUrl}
                                    />
                                </TableCell>
                                <TableCell>{row.firstName}</TableCell>
                                <TableCell>{row.phone}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            row.status === 'actif'
                                                ? 'success'
                                                : 'muted'
                                        }
                                    >
                                        {teacherStatusLabel(row.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: row.id.startsWith(
                                                'tc-local-',
                                            )
                                                ? undefined
                                                : () => {
                                                      router.visit(
                                                          show(row.id, {
                                                              query,
                                                          }),
                                                      );
                                                  },
                                            onEdit: () => openEdit(row.id),
                                            onDuplicate: () =>
                                                duplicate(row.id),
                                            onDelete: () => remove(row.id),
                                            confirm: {
                                                title: 'Retirer l’enseignant ?',
                                                description: `${row.firstName} ${row.lastName} sera retiré du corps enseignant et de ses affectations.`,
                                                confirmLabel: 'Retirer',
                                            },
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
                    editingId ? 'Modifier l’enseignant' : 'Nouvel enseignant'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    if (step < TEACHER_FORM_STEPS.length - 1) {
                        if (
                            !validate(
                                teacherStepSchema(TEACHER_FORM_STEPS[step].id),
                                form,
                            )
                        ) {
                            return;
                        }

                        setStep((current) => current + 1);

                        return;
                    }

                    void save();
                }}
                footer={
                    <FormStepActions
                        current={step}
                        total={TEACHER_FORM_STEPS.length}
                        submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                        onCancel={() => setOpen(false)}
                        onBack={() =>
                            setStep((current) => Math.max(current - 1, 0))
                        }
                        onNext={() => {
                            if (
                                !validate(
                                    teacherStepSchema(
                                        TEACHER_FORM_STEPS[step].id,
                                    ),
                                    form,
                                )
                            ) {
                                return;
                            }

                            setStep((current) =>
                                Math.min(
                                    current + 1,
                                    TEACHER_FORM_STEPS.length - 1,
                                ),
                            );
                        }}
                    />
                }
            >
                <FormSteps
                    steps={[...TEACHER_FORM_STEPS]}
                    current={step}
                    onSelect={(index) => {
                        if (
                            index <= step ||
                            teacherSectionValid(
                                form,
                                TEACHER_FORM_STEPS[step].id,
                            )
                        ) {
                            setStep(index);
                        }
                    }}
                />
                {TEACHER_FORM_STEPS[step].id === 'files' ? (
                    <FileListField
                        label="Dossier"
                        hint="CV, diplôme, contrat — PDF, Word ou image, 5 Mo maximum."
                        files={files}
                        onChange={setFiles}
                    />
                ) : (
                    <TeacherFormFields
                        section={TEACHER_FORM_STEPS[step].id}
                        form={form}
                        errors={errors}
                        onChange={(patch) => {
                            clearErrors(Object.keys(patch));
                            setForm((current) => ({ ...current, ...patch }));
                        }}
                        photoPreview={photoPreview}
                        onPhoto={(file) => {
                            if (photoPreview?.startsWith('blob:')) {
                                URL.revokeObjectURL(photoPreview);
                            }

                            setPhotoPreview(
                                file ? URL.createObjectURL(file) : null,
                            );
                        }}
                    />
                )}
            </FormSheet>
        </>
    );
}

TeachersIndex.layout = {
    breadcrumbs: [{ title: 'Enseignants', href: teachers() }],
};
