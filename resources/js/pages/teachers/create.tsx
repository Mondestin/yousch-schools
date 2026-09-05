import { Head, router } from '@inertiajs/react';
import { Briefcase, FolderOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FileListField } from '@/components/sms/file-list-field';
import { FormPreview, FormSection } from '@/components/sms/form-layout';
import { FormStepActions, FormSteps } from '@/components/sms/form-steps';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import {
    TEACHER_FORM_STEPS,
    TeacherFormFields,
    blankTeacherForm,
    teacherFormSchema,
    teacherFormValid,
    teacherFromForm,
    teacherSectionValid,
    teacherStepSchema,
} from '@/components/sms/teacher-form';
import { Badge } from '@/components/ui/badge';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { formatFrDate } from '@/lib/school-rows';
import { nextTeacherCode, teacherStatusLabel } from '@/lib/school-staff';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { store as storeTeacher } from '@/routes/api/v1/teachers';
import { create, index as teachers } from '@/routes/teachers';
import type { DossierFile, SchoolDataset } from '@/types/school';

export default function TeachersCreate({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { query, academicYearLabel } = useSchoolContext();
    const [form, setForm] = useState(() =>
        blankTeacherForm(nextTeacherCode(catalog), catalog.profile.city),
    );
    const [step, setStep] = useState(0);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [files, setFiles] = useState<DossierFile[]>([]);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const stepId = TEACHER_FORM_STEPS[step].id;

    useEffect(() => {
        return () => {
            if (photoPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const ready = teacherFormValid(form);
    const fullName = `${form.lastName} ${form.firstName}`.trim();
    const previewDetails = useMemo(
        () => [
            { label: 'Matricule', value: form.code.trim() || '—' },
            {
                label: 'Poste',
                value: form.position.trim() || 'Non renseigné',
            },
            {
                label: 'Téléphone',
                value: form.phone.trim() || '—',
            },
            {
                label: 'Embauche',
                value: form.hiredOn ? formatFrDate(form.hiredOn) : '—',
            },
            {
                label: 'Ville',
                value:
                    [form.city.trim(), form.neighborhood.trim()]
                        .filter(Boolean)
                        .join(' · ') || '—',
            },
            {
                label: 'Dossier',
                value:
                    files.length === 0
                        ? 'Aucune pièce'
                        : `${files.length} fichier${files.length > 1 ? 's' : ''}`,
            },
        ],
        [files.length, form],
    );

    function goNext(): void {
        if (!validate(teacherStepSchema(stepId), form)) {
            return;
        }

        setStep((current) =>
            Math.min(current + 1, TEACHER_FORM_STEPS.length - 1),
        );
    }

    async function submit(): Promise<void> {
        if (!validate(teacherFormSchema, form)) {
            return;
        }

        setSaving(true);

        try {
            await apiData(storeTeacher.url(), {
                method: 'POST',
                body: teacherFromForm(form),
            });
            toastSaved();
            router.visit(teachers({ query }));
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
            <Head title="Nouvel enseignant" />
            <PageShell>
                <PageHeader
                    title="Nouvel enseignant"
                    icon={Briefcase}
                    description={`Fiche complète · ${academicYearLabel}. Le résumé se met à jour au fil de la saisie.`}
                />
                <form
                    className="flex min-h-0 flex-1 flex-col gap-6"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (step < TEACHER_FORM_STEPS.length - 1) {
                            goNext();

                            return;
                        }

                        void submit();
                    }}
                >
                    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="grid gap-6">
                            <FormSteps
                                steps={[...TEACHER_FORM_STEPS]}
                                current={step}
                                onSelect={(index) => {
                                    if (
                                        index <= step ||
                                        teacherSectionValid(form, stepId)
                                    ) {
                                        setStep(index);
                                    }
                                }}
                            />
                            {stepId === 'files' ? (
                                <FormSection
                                    icon={FolderOpen}
                                    title="Dossier"
                                    description="CV, diplômes, contrat — PDF, Word ou image."
                                >
                                    <FileListField
                                        label="Pièces jointes"
                                        files={files}
                                        onChange={setFiles}
                                    />
                                </FormSection>
                            ) : (
                                <TeacherFormFields
                                    layout="page"
                                    section={stepId}
                                    form={form}
                                    errors={errors}
                                    onChange={(patch) => {
                                        clearErrors(Object.keys(patch));
                                        setForm((current) => ({
                                            ...current,
                                            ...patch,
                                        }));
                                    }}
                                    photoPreview={photoPreview}
                                    onPhoto={(file) => {
                                        if (photoPreview?.startsWith('blob:')) {
                                            URL.revokeObjectURL(photoPreview);
                                        }

                                        setPhotoPreview(
                                            file
                                                ? URL.createObjectURL(file)
                                                : null,
                                        );
                                    }}
                                />
                            )}
                        </div>
                        <FormPreview
                            photoUrl={photoPreview}
                            name={fullName}
                            fallback="Nouvel enseignant"
                            hint={
                                form.qualification.trim() ||
                                'Qualification à renseigner'
                            }
                            details={previewDetails}
                        >
                            <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
                                <Badge
                                    variant={
                                        form.status === 'actif'
                                            ? 'success'
                                            : 'muted'
                                    }
                                >
                                    {teacherStatusLabel(form.status)}
                                </Badge>
                                <p className="text-muted-foreground text-[12px]">
                                    {ready
                                        ? 'Fiche prête'
                                        : 'Champs obligatoires manquants'}
                                </p>
                            </div>
                        </FormPreview>
                    </div>
                    <div className="bg-background/90 sticky bottom-0 z-10 -mx-6 mt-auto flex justify-end gap-2 border-t px-6 py-3 backdrop-blur">
                        <FormStepActions
                            current={step}
                            total={TEACHER_FORM_STEPS.length}
                            submitLabel={saving ? 'Enregistrement…' : 'Créer'}
                            disabled={saving}
                            onCancel={() => router.visit(teachers({ query }))}
                            onBack={() =>
                                setStep((current) => Math.max(current - 1, 0))
                            }
                            onNext={goNext}
                        />
                    </div>
                </form>
            </PageShell>
        </>
    );
}

TeachersCreate.layout = {
    breadcrumbs: [
        { title: 'Enseignants', href: teachers() },
        { title: 'Nouveau', href: create() },
    ],
};
