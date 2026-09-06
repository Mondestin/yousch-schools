import { Head } from '@inertiajs/react';
import { Briefcase, Pencil, Plus, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FileListField } from '@/components/sms/file-list-field';
import { FormSheet } from '@/components/sms/form-sheet';
import { FormStepActions, FormSteps } from '@/components/sms/form-steps';
import { InfoField } from '@/components/sms/info-field';
import { PageShell } from '@/components/sms/page-shell';
import { RowMenu } from '@/components/sms/row-menu';
import {
    TEACHER_FORM_STEPS,
    TeacherFormFields,
    teacherFormData,
    teacherFormSchema,
    teacherSectionValid,
    teacherStepSchema,
    teacherToForm,
} from '@/components/sms/teacher-form';
import { SearchSelect } from '@/components/sms/search-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { requiredText, parseFields } from '@/lib/school-form';
import { formatFrDate, isLyceeCycle, personName } from '@/lib/school-rows';
import { z } from 'zod';
import { dossierFilesOf } from '@/lib/school-files';
import { genderLabel } from '@/lib/school-students';
import { teacherFiche, teacherStatusLabel } from '@/lib/school-staff';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyAssignment,
    store as storeAssignment,
    update as updateAssignment,
} from '@/routes/api/v1/teacher-assignments';
import { update as updateTeacher } from '@/routes/api/v1/teachers';
import { index as teachers } from '@/routes/teachers';
import type {
    DossierFile,
    SchoolDataset,
    Teacher,
    TeacherAssignment,
} from '@/types/school';

export default function TeacherShowPage({
    catalog,
    teacherId,
}: {
    catalog: SchoolDataset;
    teacherId: string;
}) {
    const { filter } = useSchoolContext();
    const [teacher, setTeacher] = useState<Teacher | null>(
        catalog.teachers.find((item) => item.id === teacherId) ?? null,
    );
    const [assignments, setAssignments] = useState<TeacherAssignment[]>(
        catalog.teacherAssignments,
    );
    const [identityOpen, setIdentityOpen] = useState(false);
    const [identityStep, setIdentityStep] = useState(0);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [savingIdentity, setSavingIdentity] = useState(false);
    const [savingAssign, setSavingAssign] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        teacher?.photoUrl ?? null,
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [files, setFiles] = useState<DossierFile[]>(dossierFilesOf(teacher));
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [form, setForm] = useState(() =>
        teacher ? teacherToForm(teacher) : teacherToForm(catalog.teachers[0]),
    );
    const [assignForm, setAssignForm] = useState({
        academicYearId: filter.academicYearId,
        classroomId: '',
        subjectId: '',
        trackId: '',
    });

    const working = useMemo(
        () =>
            teacher
                ? {
                      ...catalog,
                      teachers: catalog.teachers.map((item) =>
                          item.id === teacher.id ? teacher : item,
                      ),
                      teacherAssignments: assignments,
                  }
                : catalog,
        [assignments, catalog, teacher],
    );
    const fiche = teacher ? teacherFiche(working, teacher.id) : null;
    const classrooms = catalog.classrooms.filter(
        (classroom) => classroom.academicYearId === assignForm.academicYearId,
    );
    const selectedClassroom = classrooms.find(
        (classroom) => classroom.id === assignForm.classroomId,
    );
    const subjects = catalog.subjects.filter((subject) => {
        if (!selectedClassroom) {
            return false;
        }

        return (
            subject.cycle === selectedClassroom.cycle &&
            subject.gradeLevelId === selectedClassroom.gradeLevelId &&
            (selectedClassroom.trackId === null ||
                subject.trackId === null ||
                subject.trackId === selectedClassroom.trackId)
        );
    });
    const lycee = selectedClassroom
        ? isLyceeCycle(selectedClassroom.cycle)
        : false;

    if (!teacher || !fiche) {
        return null;
    }

    const current = teacher;

    function openEdit(): void {
        setForm(teacherToForm(current));
        setPhotoPreview(current.photoUrl);
        setPhotoFile(null);
        setFiles(dossierFilesOf(current));
        setPendingFiles([]);
        setIdentityStep(0);
        clearErrors();
        setIdentityOpen(true);
    }

    async function saveIdentity(): Promise<void> {
        if (!validate(teacherFormSchema, form)) {
            return;
        }

        setSavingIdentity(true);

        try {
            const saved = await apiData<Teacher>(updateTeacher.url(teacherId), {
                method: 'PUT',
                formData: teacherFormData(form, {
                    photo: photoFile,
                    files: pendingFiles,
                }),
            });
            setTeacher(saved);
            setPhotoPreview(saved.photoUrl);
            setPhotoFile(null);
            setPendingFiles([]);
            setFiles(dossierFilesOf(saved));
            setIdentityOpen(false);
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
            setSavingIdentity(false);
        }
    }

    function openAssign(): void {
        const first = catalog.classrooms.find(
            (classroom) => classroom.academicYearId === filter.academicYearId,
        );
        setEditingAssignId(null);
        setAssignForm({
            academicYearId: filter.academicYearId,
            classroomId: first?.id ?? '',
            subjectId: '',
            trackId: first?.trackId ?? '',
        });
        clearErrors();
        setAssignOpen(true);
    }

    function openEditAssign(id: string): void {
        const assignment = assignments.find((item) => item.id === id);

        if (!assignment) {
            return;
        }

        setEditingAssignId(id);
        setAssignForm({
            academicYearId: assignment.academicYearId,
            classroomId: assignment.classroomId,
            subjectId: assignment.subjectId,
            trackId: assignment.trackId ?? '',
        });
        clearErrors();
        setAssignOpen(true);
    }

    async function saveAssign(): Promise<void> {
        const result = parseFields(
            z.object({
                academicYearId: requiredText('L’année'),
                classroomId: requiredText('La classe'),
                subjectId: requiredText('La matière'),
                trackId: lycee ? requiredText('La série') : z.string(),
            }),
            assignForm,
        );

        if (!result.ok) {
            showErrors(result.errors);

            return;
        }

        const payload = {
            teacherId,
            academicYearId: assignForm.academicYearId,
            classroomId: assignForm.classroomId,
            subjectId: assignForm.subjectId,
            trackId: lycee ? assignForm.trackId || null : null,
        };

        setSavingAssign(true);

        try {
            const saved = editingAssignId
                ? await apiData<TeacherAssignment>(
                      updateAssignment.url(editingAssignId),
                      { method: 'PUT', body: payload },
                  )
                : await apiData<TeacherAssignment>(storeAssignment.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setAssignments((currentItems) =>
                editingAssignId
                    ? currentItems.map((item) =>
                          item.id === editingAssignId ? saved : item,
                      )
                    : [...currentItems, saved],
            );
            setAssignOpen(false);
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
            setSavingAssign(false);
        }
    }

    async function removeAssign(id: string): Promise<void> {
        try {
            await apiJson(destroyAssignment.url(id), { method: 'DELETE' });
            setAssignments((currentItems) =>
                currentItems.filter((item) => item.id !== id),
            );
            toastRemoved();
        } catch (error) {
            toastApiError(error);
        }
    }

    return (
        <>
            <Head title={fiche.name} />
            <PageShell>
                <header className="flex items-start gap-4">
                    {teacher.photoUrl ? (
                        <img
                            src={teacher.photoUrl}
                            alt=""
                            className="size-16 rounded-[8px] border object-cover"
                        />
                    ) : (
                        <Briefcase className="text-primary mt-1 size-8 shrink-0" />
                    )}
                    <div className="min-w-0 space-y-1">
                        <h1 className="text-[22px] font-semibold tracking-tight">
                            {personName(teacher)}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="code">{teacher.code}</Badge>
                            <Badge
                                variant={
                                    teacher.status === 'actif'
                                        ? 'success'
                                        : 'muted'
                                }
                            >
                                {teacherStatusLabel(teacher.status)}
                            </Badge>
                        </div>
                    </div>
                </header>

                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[15px] font-semibold">Identité</h2>
                        <Button type="button" onClick={openEdit}>
                            Modifier
                        </Button>
                    </div>
                    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
                        <InfoField label="Matricule" value={teacher.code} />
                        <InfoField
                            label="Genre"
                            value={genderLabel(teacher.gender)}
                        />
                        <InfoField label="Nom" value={teacher.lastName} />
                        <InfoField label="Prénom" value={teacher.firstName} />
                        <InfoField label="Téléphone" value={teacher.phone} />
                        <InfoField label="E-mail" value={teacher.email} />
                        <InfoField
                            label="Date de naissance"
                            value={
                                teacher.bornOn
                                    ? formatFrDate(teacher.bornOn)
                                    : null
                            }
                        />
                        <InfoField label="Poste" value={teacher.position} />
                        <InfoField
                            label="Qualification"
                            value={teacher.qualification}
                        />
                        <InfoField
                            label="Date d’embauche"
                            value={formatFrDate(teacher.hiredOn)}
                        />
                        <InfoField
                            label="Situation"
                            value={teacher.maritalStatus}
                        />
                        <InfoField label="Ville" value={teacher.city} />
                        <InfoField
                            label="Quartier"
                            value={teacher.neighborhood}
                        />
                        <InfoField label="Adresse" value={teacher.address} />
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-[15px] font-semibold">Dossier</h2>
                    <div className="max-w-3xl">
                        <FileListField files={dossierFilesOf(teacher)} />
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[15px] font-semibold">
                            Affectations
                        </h2>
                        <Button type="button" onClick={openAssign}>
                            <Plus />
                            Ajouter
                        </Button>
                    </div>
                    <div className="overflow-hidden rounded-[8px] border">
                        {fiche.assignments.length === 0 ? (
                            <EmptyState
                                icon={Briefcase}
                                title="Aucune affectation"
                                description="Ajoutez une matière, une classe et une année. Un enseignant n’est pas collé à une seule matière."
                            />
                        ) : (
                            <Table containerClassName="rounded-none border-0">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Année</TableHead>
                                        <TableHead>Classe</TableHead>
                                        <TableHead>Série</TableHead>
                                        <TableHead>Matière</TableHead>
                                        <TableHead>Cycle</TableHead>
                                        <TableHead className="w-12">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fiche.assignments.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                {row.yearLabel}
                                            </TableCell>
                                            <TableCell>
                                                {row.classroom}
                                            </TableCell>
                                            <TableCell>
                                                {row.trackCode ? (
                                                    <Badge variant="code">
                                                        {row.trackCode}
                                                    </Badge>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">
                                                    {row.subject}
                                                </span>{' '}
                                                <Badge variant="code">
                                                    {row.subjectCode}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {row.cycleName}
                                            </TableCell>
                                            <TableCell>
                                                <RowMenu
                                                    items={[
                                                        {
                                                            label: 'Modifier l’affectation',
                                                            icon: Pencil,
                                                            onSelect: () =>
                                                                openEditAssign(
                                                                    row.id,
                                                                ),
                                                        },
                                                        {
                                                            label: 'Retirer',
                                                            icon: UserMinus,
                                                            destructive: true,
                                                            confirm: {
                                                                title: 'Retirer cette affectation ?',
                                                                description: `${row.subject} en ${row.classroom} ne sera plus assigné à cet enseignant.`,
                                                            },
                                                            onSelect: () => {
                                                                void removeAssign(
                                                                    row.id,
                                                                );
                                                            },
                                                        },
                                                    ]}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </section>
            </PageShell>

            <FormSheet
                open={identityOpen}
                onOpenChange={setIdentityOpen}
                title="Modifier l’enseignant"
                submitLabel="Enregistrer"
                submitting={savingIdentity}
                onSubmit={() => {
                    if (identityStep < TEACHER_FORM_STEPS.length - 1) {
                        if (
                            !validate(
                                teacherStepSchema(
                                    TEACHER_FORM_STEPS[identityStep].id,
                                ),
                                form,
                            )
                        ) {
                            return;
                        }

                        setIdentityStep((currentStep) => currentStep + 1);

                        return;
                    }

                    void saveIdentity();
                }}
                footer={
                    <FormStepActions
                        current={identityStep}
                        total={TEACHER_FORM_STEPS.length}
                        submitLabel="Enregistrer"
                        onCancel={() => setIdentityOpen(false)}
                        onBack={() =>
                            setIdentityStep((currentStep) =>
                                Math.max(currentStep - 1, 0),
                            )
                        }
                        onNext={() => {
                            if (
                                !validate(
                                    teacherStepSchema(
                                        TEACHER_FORM_STEPS[identityStep].id,
                                    ),
                                    form,
                                )
                            ) {
                                return;
                            }

                            setIdentityStep((currentStep) =>
                                Math.min(
                                    currentStep + 1,
                                    TEACHER_FORM_STEPS.length - 1,
                                ),
                            );
                        }}
                    />
                }
            >
                <FormSteps
                    steps={[...TEACHER_FORM_STEPS]}
                    current={identityStep}
                    onSelect={(index) => {
                        if (
                            index <= identityStep ||
                            teacherSectionValid(
                                form,
                                TEACHER_FORM_STEPS[identityStep].id,
                            )
                        ) {
                            setIdentityStep(index);
                        }
                    }}
                />
                {TEACHER_FORM_STEPS[identityStep].id === 'files' ? (
                    <FileListField
                        label="Dossier"
                        hint="CV, diplôme, contrat - PDF, Word ou image, 5 Mo maximum."
                        files={files}
                        onChange={setFiles}
                        onNativeFiles={(incoming) =>
                            setPendingFiles((current) => [
                                ...current,
                                ...incoming,
                            ])
                        }
                    />
                ) : (
                    <TeacherFormFields
                        section={TEACHER_FORM_STEPS[identityStep].id}
                        form={form}
                        errors={errors}
                        onChange={(patch) => {
                            clearErrors(Object.keys(patch));
                            setForm((currentForm) => ({
                                ...currentForm,
                                ...patch,
                            }));
                        }}
                        photoPreview={photoPreview}
                        onPhoto={(file) => {
                            if (photoPreview?.startsWith('blob:')) {
                                URL.revokeObjectURL(photoPreview);
                            }

                            setPhotoFile(file);
                            setPhotoPreview(
                                file
                                    ? URL.createObjectURL(file)
                                    : current.photoUrl,
                            );
                        }}
                    />
                )}
            </FormSheet>

            <FormSheet
                open={assignOpen}
                onOpenChange={setAssignOpen}
                title={
                    editingAssignId
                        ? 'Modifier l’affectation'
                        : 'Nouvelle affectation'
                }
                description="Matière × classe × série × année."
                submitLabel={editingAssignId ? 'Enregistrer' : 'Créer'}
                submitting={savingAssign}
                onSubmit={() => {
                    void saveAssign();
                }}
            >
                <Field
                    id="academicYearId"
                    label="Année"
                    required
                    error={errors.academicYearId}
                >
                    <Select
                        value={assignForm.academicYearId}
                        onValueChange={(value) => {
                            clearErrors([
                                'academicYearId',
                                'classroomId',
                                'subjectId',
                                'trackId',
                            ]);
                            setAssignForm((currentForm) => ({
                                ...currentForm,
                                academicYearId: value,
                                classroomId: '',
                                subjectId: '',
                                trackId: '',
                            }));
                        }}
                    >
                        <SelectTrigger id="academicYearId" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {catalog.academicYears.map((year) => (
                                <SelectItem key={year.id} value={year.id}>
                                    {year.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        value={assignForm.classroomId}
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
                            clearErrors([
                                'classroomId',
                                'subjectId',
                                'trackId',
                            ]);
                            setAssignForm((currentForm) => ({
                                ...currentForm,
                                classroomId: value,
                                subjectId: '',
                                trackId: classroom?.trackId ?? '',
                            }));
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
                            value={assignForm.trackId || undefined}
                            onValueChange={(value) => {
                                clearErrors('trackId');
                                setAssignForm((currentForm) => ({
                                    ...currentForm,
                                    trackId: value,
                                }));
                            }}
                        >
                            <SelectTrigger id="trackId" className="w-full">
                                <SelectValue placeholder="Choisir une série" />
                            </SelectTrigger>
                            <SelectContent>
                                {catalog.tracks
                                    .filter(
                                        (track) =>
                                            track.cycle ===
                                            selectedClassroom?.cycle,
                                    )
                                    .map((track) => (
                                        <SelectItem
                                            key={track.id}
                                            value={track.id}
                                        >
                                            {track.code}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </Field>
                ) : null}
                <Field
                    id="subjectId"
                    label="Matière"
                    required
                    error={errors.subjectId}
                >
                    <Select
                        value={assignForm.subjectId || undefined}
                        onValueChange={(value) => {
                            clearErrors('subjectId');
                            setAssignForm((currentForm) => ({
                                ...currentForm,
                                subjectId: value,
                            }));
                        }}
                    >
                        <SelectTrigger id="subjectId" className="w-full">
                            <SelectValue placeholder="Choisir une matière" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                    {subject.code} - {subject.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FormSheet>
        </>
    );
}

TeacherShowPage.layout = {
    breadcrumbs: [
        { title: 'Enseignants', href: teachers() },
        { title: 'Fiche', href: teachers() },
    ],
};
