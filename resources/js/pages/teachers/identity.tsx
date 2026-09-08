import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { FormSheet } from '@/components/sms/form-sheet';
import { FormStepActions, FormSteps } from '@/components/sms/form-steps';
import { InfoField } from '@/components/sms/info-field';
import {
    TEACHER_FORM_STEPS,
    TeacherFormFields,
    teacherFormData,
    teacherFormSchema,
    teacherSectionValid,
    teacherStepSchema,
    teacherToForm,
} from '@/components/sms/teacher-form';
import { Button } from '@/components/ui/button';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useYearLock } from '@/hooks/use-year-lock';
import { formatFrDate } from '@/lib/school-rows';
import { genderLabel } from '@/lib/school-students';
import { teacherFiche } from '@/lib/school-staff';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { update as updateTeacher } from '@/routes/api/v1/teachers';
import { index as teachers } from '@/routes/teachers';
import type { SchoolDataset, Teacher } from '@/types/school';

const IDENTITY_STEPS = TEACHER_FORM_STEPS.filter(
    (step) => step.id !== 'files',
);

export default function TeacherIdentityPage({
    catalog,
    teacherId,
}: {
    catalog: SchoolDataset;
    teacherId: string;
}) {
    const { locked, canMutate, lockHint } = useYearLock();

    const fiche = teacherFiche(catalog, teacherId);
    const [teacher, setTeacher] = useState<Teacher | null>(
        fiche?.teacher ?? null,
    );
    const [identityOpen, setIdentityOpen] = useState(false);
    const [identityStep, setIdentityStep] = useState(0);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [savingIdentity, setSavingIdentity] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        teacher?.photoUrl ?? null,
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [form, setForm] = useState(() =>
        teacher ? teacherToForm(teacher) : teacherToForm(catalog.teachers[0]),
    );

    if (!teacher || !fiche) {
        return null;
    }

    const current = teacher;

    function openEdit(): void {
        setForm(teacherToForm(current));
        setPhotoPreview(current.photoUrl);
        setPhotoFile(null);
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
                }),
            });
            setTeacher(saved);
            setPhotoPreview(saved.photoUrl);
            setPhotoFile(null);
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

    return (
        <>
            <Head title={fiche.name} />
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold">Identité</h2>
                {canMutate ? (
                <Button type="button" onClick={openEdit}>
                    Modifier
                </Button>
            ) : null}
            </div>
            <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
                <InfoField label="Matricule" value={teacher.code} />
                <InfoField label="Genre" value={genderLabel(teacher.gender)} />
                <InfoField label="Nom" value={teacher.lastName} />
                <InfoField label="Prénom" value={teacher.firstName} />
                <InfoField label="Téléphone" value={teacher.phone} />
                <InfoField label="E-mail" value={teacher.email} />
                <InfoField
                    label="Date de naissance"
                    value={
                        teacher.bornOn ? formatFrDate(teacher.bornOn) : null
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
                <InfoField label="Situation" value={teacher.maritalStatus} />
                <InfoField label="Ville" value={teacher.city} />
                <InfoField label="Quartier" value={teacher.neighborhood} />
                <InfoField label="Adresse" value={teacher.address} />
            </div>

            <FormSheet
                open={identityOpen}
                onOpenChange={setIdentityOpen}
                title="Modifier l’enseignant"
                submitLabel="Enregistrer"
                submitting={savingIdentity}
                onSubmit={() => {
                    if (identityStep < IDENTITY_STEPS.length - 1) {
                        if (
                            !validate(
                                teacherStepSchema(
                                    IDENTITY_STEPS[identityStep].id,
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
                        total={IDENTITY_STEPS.length}
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
                                        IDENTITY_STEPS[identityStep].id,
                                    ),
                                    form,
                                )
                            ) {
                                return;
                            }

                            setIdentityStep((currentStep) =>
                                Math.min(
                                    currentStep + 1,
                                    IDENTITY_STEPS.length - 1,
                                ),
                            );
                        }}
                    />
                }
            >
                <FormSteps
                    steps={[...IDENTITY_STEPS]}
                    current={identityStep}
                    onSelect={(index) => {
                        if (
                            index <= identityStep ||
                            teacherSectionValid(
                                form,
                                IDENTITY_STEPS[identityStep].id,
                            )
                        ) {
                            setIdentityStep(index);
                        }
                    }}
                />
                <TeacherFormFields
                    section={IDENTITY_STEPS[identityStep].id}
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
            </FormSheet>
        </>
    );
}

TeacherIdentityPage.layout = {
    breadcrumbs: [
        { title: 'Enseignants', href: teachers() },
        { title: 'Fiche', href: teachers() },
    ],
};
