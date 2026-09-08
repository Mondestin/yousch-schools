import { Head } from '@inertiajs/react';
import { GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DatePicker } from '@/components/sms/date-picker';
import { Field } from '@/components/sms/field';
import { FileListField } from '@/components/sms/file-list-field';
import { FormSheet } from '@/components/sms/form-sheet';
import { FormStepActions, FormSteps } from '@/components/sms/form-steps';
import { GenderSelect } from '@/components/sms/gender-select';
import { InfoField } from '@/components/sms/info-field';
import { PhotoField } from '@/components/sms/photo-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useYearLock } from '@/hooks/use-year-lock';
import { useSchoolContext } from '@/hooks/use-school-context';
import { studentContactSchema, studentIdentitySchema } from '@/lib/school-form';
import { formatFrDate } from '@/lib/school-rows';
import { z } from 'zod';
import { dossierFilesOf } from '@/lib/school-files';
import { genderLabel, studentFiche } from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { update as updateStudent } from '@/routes/api/v1/students';
import { index as students } from '@/routes/students';
import type {
    DossierFile,
    Gender,
    SchoolDataset,
    Student,
} from '@/types/school';

const STEPS = [
    { id: 'identity', title: 'Identité' },
    { id: 'contact', title: 'Coordonnées' },
    { id: 'files', title: 'Dossier' },
] as const;

export default function StudentIdentityPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { locked, canMutate, lockHint } = useYearLock();

    const { filter } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);
    const [student, setStudent] = useState(fiche?.student ?? null);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        fiche?.student.photoUrl ?? null,
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [files, setFiles] = useState<DossierFile[]>(
        dossierFilesOf(fiche?.student),
    );
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        lastName: fiche?.student.lastName ?? '',
        firstName: fiche?.student.firstName ?? '',
        gender: (fiche?.student.gender ?? 'femme') as Gender,
        bornOn: fiche?.student.bornOn ?? '',
        city: fiche?.student.city ?? '',
        neighborhood: fiche?.student.neighborhood ?? '',
        phone: fiche?.student.phone ?? '',
        email: fiche?.student.email ?? '',
        address: fiche?.student.address ?? '',
        enrolledOn: fiche?.student.enrolledOn ?? '',
    });

    useEffect(() => {
        return () => {
            if (photoPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    if (!fiche || !student) {
        return null;
    }

    const current = student;

    function openEdit(): void {
        setForm({
            lastName: current.lastName,
            firstName: current.firstName,
            gender: current.gender,
            bornOn: current.bornOn,
            city: current.city,
            neighborhood: current.neighborhood,
            phone: current.phone ?? '',
            email: current.email ?? '',
            address: current.address ?? '',
            enrolledOn: current.enrolledOn,
        });
        setPhotoPreview(current.photoUrl);
        setPhotoFile(null);
        setFiles(dossierFilesOf(current));
        setStep(0);
        clearErrors();
        setOpen(true);
    }

    const stepSchema = [
        studentIdentitySchema,
        studentContactSchema,
        z.object({}),
    ][step];

    function patchForm(next: Partial<typeof form>): void {
        clearErrors(Object.keys(next));
        setForm((currentForm) => ({ ...currentForm, ...next }));
    }

    function goNext(): void {
        if (!validate(stepSchema, form)) {
            return;
        }

        setStep((currentStep) => Math.min(currentStep + 1, STEPS.length - 1));
    }

    async function save(): Promise<void> {
        if (
            !validate(studentIdentitySchema.merge(studentContactSchema), form)
        ) {
            return;
        }

        const payload = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            gender: form.gender,
            bornOn: form.bornOn,
            city: form.city.trim(),
            neighborhood: form.neighborhood.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
            enrolledOn: form.enrolledOn,
        };

        setSaving(true);

        try {
            let saved: Student;

            if (photoFile) {
                const body = new FormData();

                for (const [key, value] of Object.entries(payload)) {
                    if (value !== null) {
                        body.append(key, String(value));
                    }
                }

                body.append('photo', photoFile);
                saved = await apiData<Student>(updateStudent.url(studentId), {
                    method: 'PUT',
                    formData: body,
                });
            } else {
                saved = await apiData<Student>(updateStudent.url(studentId), {
                    method: 'PUT',
                    body: payload,
                });
            }

            setStudent({
                ...saved,
                files: saved.files ?? files,
            });
            setPhotoPreview(saved.photoUrl);
            setPhotoFile(null);
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
                <InfoField label="Matricule" value={student.matricule} />
                <InfoField label="Genre" value={genderLabel(student.gender)} />
                <InfoField label="Nom" value={student.lastName} />
                <InfoField label="Prénom" value={student.firstName} />
                <InfoField
                    label="Date de naissance"
                    value={formatFrDate(student.bornOn)}
                />
                <InfoField
                    label="Date d’inscription"
                    value={formatFrDate(student.enrolledOn)}
                />
                <InfoField label="Ville" value={student.city} />
                <InfoField label="Quartier" value={student.neighborhood} />
                <InfoField label="Adresse" value={student.address} />
                <InfoField label="Téléphone" value={student.phone} />
                <InfoField label="E-mail" value={student.email} />
            </div>

            <div className="mt-8 max-w-3xl space-y-4">
                <h2 className="text-[15px] font-semibold">Dossier</h2>
                <FileListField files={dossierFilesOf(student)} />
            </div>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title="Modifier l’identité"
                description={student.matricule}
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    if (step < STEPS.length - 1) {
                        goNext();

                        return;
                    }

                    void save();
                }}
                footer={
                    <FormStepActions
                        current={step}
                        total={STEPS.length}
                        submitLabel={saving ? 'Enregistrement…' : 'Enregistrer'}
                        disabled={saving}
                        onCancel={() => setOpen(false)}
                        onBack={() =>
                            setStep((currentStep) =>
                                Math.max(currentStep - 1, 0),
                            )
                        }
                        onNext={goNext}
                    />
                }
            >
                <FormSteps
                    steps={[...STEPS]}
                    current={step}
                    onSelect={(index) => {
                        if (
                            index <= step ||
                            stepSchema.safeParse(form).success
                        ) {
                            setStep(index);
                        }
                    }}
                />
                {step === 0 ? (
                    <>
                        <PhotoField
                            preview={photoPreview}
                            fallback={GraduationCap}
                            onFile={(file) => {
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
                                    patchForm({
                                        firstName: event.target.value,
                                    })
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
                                onChange={(value) =>
                                    patchForm({ bornOn: value })
                                }
                            />
                        </Field>
                    </>
                ) : null}
                {step === 1 ? (
                    <>
                        <Field
                            id="city"
                            label="Ville"
                            required
                            error={errors.city}
                        >
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
                                    patchForm({
                                        neighborhood: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field id="address" label="Adresse">
                            <Input
                                id="address"
                                value={form.address}
                                onChange={(event) =>
                                    patchForm({ address: event.target.value })
                                }
                            />
                        </Field>
                        <Field id="phone" label="Téléphone">
                            <Input
                                id="phone"
                                value={form.phone}
                                onChange={(event) =>
                                    patchForm({ phone: event.target.value })
                                }
                            />
                        </Field>
                        <Field id="email" label="E-mail" error={errors.email}>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(event) =>
                                    patchForm({ email: event.target.value })
                                }
                            />
                        </Field>
                        <Field
                            id="enrolledOn"
                            label="Date d’inscription"
                            required
                            error={errors.enrolledOn}
                        >
                            <DatePicker
                                id="enrolledOn"
                                value={form.enrolledOn}
                                onChange={(value) =>
                                    patchForm({ enrolledOn: value })
                                }
                            />
                        </Field>
                    </>
                ) : null}
                {step === 2 ? (
                    <FileListField
                        label="Pièces de l’élève"
                        hint="Extrait de naissance, photos, carnet, certificat - PDF ou image, 5 Mo maximum."
                        files={files}
                        onChange={setFiles}
                    />
                ) : null}
            </FormSheet>
        </>
    );
}

StudentIdentityPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Fiche', href: students() },
    ],
};
