import { Head, router } from '@inertiajs/react';
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DatePicker } from '@/components/sms/date-picker';
import { DetailSectionCard } from '@/components/sms/person-profile-header';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { GenderSelect } from '@/components/sms/gender-select';
import { InfoField } from '@/components/sms/info-field';
import { PhotoField } from '@/components/sms/photo-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useYearLock } from '@/hooks/use-year-lock';
import { useSchoolContext } from '@/hooks/use-school-context';
import { ApiError, apiJson } from '@/lib/api';
import {
    optionalEmail,
    requiredEmail,
    studentContactSchema,
    studentIdentitySchema,
} from '@/lib/school-form';
import { isSecondaryCycle } from '@/lib/school-rows';
import { genderLabel, studentFiche } from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { update as updateStudent } from '@/routes/api/v1/students';
import { index as students } from '@/routes/students';
import type { Gender, SchoolDataset, Student } from '@/types/school';
import { z } from 'zod';

type IdentityForm = {
    matricule: string;
    lastName: string;
    firstName: string;
    gender: Gender;
    bornOn: string;
    city: string;
    neighborhood: string;
    address: string;
    phone: string;
    email: string;
    enrolledOn: string;
};

function studentIdentityFormData(
    form: IdentityForm,
    current: Student,
    options: { photo?: File | null; removePhoto?: boolean },
): FormData {
    const body = new FormData();
    const payload = {
        matricule: form.matricule.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        bornOn: form.bornOn,
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        enrolledOn: form.enrolledOn,
        isTransfer: current.isTransfer ?? false,
        previousSchoolName: current.previousSchoolName,
        previousAcademicYear: current.previousAcademicYear,
        previousClass: current.previousClass,
        previousSchoolCity: current.previousSchoolCity,
    };

    for (const [key, value] of Object.entries(payload)) {
        if (value === null || value === undefined) {
            continue;
        }

        if (typeof value === 'boolean') {
            body.append(key, value ? '1' : '0');
        } else {
            body.append(key, String(value));
        }
    }

    if (options.photo) {
        body.append('photo', options.photo);
    }

    if (options.removePhoto) {
        body.append('removePhoto', '1');
    }

    return body;
}

function formFromStudent(student: Student): IdentityForm {
    return {
        matricule: student.matricule,
        lastName: student.lastName,
        firstName: student.firstName,
        gender: student.gender,
        bornOn: student.bornOn,
        city: student.city,
        neighborhood: student.neighborhood,
        address: student.address ?? '',
        phone: student.phone ?? '',
        email: student.email ?? '',
        enrolledOn: student.enrolledOn,
    };
}

export default function StudentIdentityPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { locked, canMutate } = useYearLock();
    const { filter } = useSchoolContext();
    const secondary = isSecondaryCycle(filter.cycle);
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);
    const [student, setStudent] = useState(fiche?.student ?? null);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [form, setForm] = useState<IdentityForm>(() =>
        fiche?.student
            ? formFromStudent(fiche.student)
            : {
                  matricule: '',
                  lastName: '',
                  firstName: '',
                  gender: 'femme',
                  bornOn: '',
                  city: '',
                  neighborhood: '',
                  address: '',
                  phone: '',
                  email: '',
                  enrolledOn: '',
              },
    );
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        fiche?.student.photoUrl ?? null,
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);

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
    const editSchema = studentIdentitySchema
        .merge(studentContactSchema)
        .extend({
            matricule: z.string().trim().min(1, 'Le matricule est obligatoire.'),
            email: secondary
                ? requiredEmail('L’e-mail de l’élève')
                : optionalEmail(),
        });

    function patchForm(next: Partial<IdentityForm>): void {
        clearErrors(Object.keys(next));
        setForm((currentForm) => ({ ...currentForm, ...next }));
    }

    function openEdit(): void {
        setForm(formFromStudent(current));
        setPhotoPreview(current.photoUrl);
        setPhotoFile(null);
        setRemovePhoto(false);
        clearErrors();
        setOpen(true);
    }

    async function save(): Promise<void> {
        if (!validate(editSchema, form)) {
            return;
        }

        setSaving(true);

        try {
            const response = await apiJson<{
                data: Student;
                meta?: { studentAccountCreated?: boolean };
            }>(updateStudent.url(studentId), {
                method: 'PUT',
                formData: studentIdentityFormData(form, current, {
                    photo: photoFile,
                    removePhoto,
                }),
            });
            const saved = response.data;
            setStudent(saved);
            setPhotoPreview(saved.photoUrl);
            setPhotoFile(null);
            setRemovePhoto(false);
            setOpen(false);
            toastSaved(
                response.meta?.studentAccountCreated
                    ? 'Identité enregistrée · compte élève créé'
                    : undefined,
            );
            router.reload({ only: ['catalog'] });
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
            <Head title={`${fiche.name} : Identité`} />
            <div className="space-y-4">
                <DetailSectionCard
                    title="Identité"
                    description="État civil et photo de l’élève."
                    action={
                        canMutate && !locked ? (
                            <Button type="button" onClick={openEdit}>
                                Modifier
                            </Button>
                        ) : null
                    }
                >
                    <div className="mb-5 flex items-center gap-4">
                        {current.photoUrl ? (
                            <img
                                src={current.photoUrl}
                                alt=""
                                className="size-20 rounded-[12px] border object-cover"
                            />
                        ) : (
                            <div className="bg-primary/10 text-primary flex size-20 items-center justify-center rounded-[12px]">
                                <User className="size-8" />
                            </div>
                        )}
                        <div>
                            <p className="text-[14px] font-medium">
                                {current.lastName} {current.firstName}
                            </p>
                            <p className="text-muted-foreground font-mono text-[12px]">
                                {current.matricule}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoField label="Nom" value={current.lastName} />
                        <InfoField label="Prénom" value={current.firstName} />
                        <InfoField
                            label="Sexe"
                            value={genderLabel(current.gender)}
                        />
                        <InfoField
                            label="Date de naissance"
                            value={current.bornOn}
                        />
                        <InfoField
                            label="Matricule"
                            value={current.matricule}
                        />
                        <InfoField
                            label="Date d’inscription"
                            value={current.enrolledOn}
                        />
                    </div>
                </DetailSectionCard>

                <DetailSectionCard
                    title="Coordonnées"
                    description="Adresse et moyens de contact."
                    action={
                        canMutate && !locked ? (
                            <Button type="button" onClick={openEdit}>
                                Modifier
                            </Button>
                        ) : null
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoField label="Ville" value={current.city} />
                        <InfoField
                            label="Quartier"
                            value={current.neighborhood}
                        />
                        <InfoField label="Adresse" value={current.address} />
                        <InfoField label="Téléphone" value={current.phone} />
                        <InfoField label="E-mail" value={current.email} />
                    </div>
                </DetailSectionCard>
            </div>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title="Modifier l’élève"
                description="Identité, photo et coordonnées."
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <PhotoField
                    preview={photoPreview}
                    fallback={User}
                    onFile={(file) => {
                        if (photoPreview?.startsWith('blob:')) {
                            URL.revokeObjectURL(photoPreview);
                        }

                        setPhotoFile(file);
                        setRemovePhoto(false);
                        setPhotoPreview(
                            file
                                ? URL.createObjectURL(file)
                                : current.photoUrl,
                        );
                    }}
                />
                {current.photoUrl && !photoFile ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground -mt-2 self-start"
                        onClick={() => {
                            setPhotoFile(null);
                            setRemovePhoto(true);
                            setPhotoPreview(null);
                        }}
                    >
                        Retirer la photo
                    </Button>
                ) : null}
                <Field id="matricule" label="Matricule" error={errors.matricule}>
                    <Input
                        id="matricule"
                        value={form.matricule}
                        onChange={(event) =>
                            patchForm({ matricule: event.target.value })
                        }
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="lastName" label="Nom" error={errors.lastName}>
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <GenderSelect
                        value={form.gender}
                        label="Sexe"
                        error={errors.gender}
                        onChange={(gender) => patchForm({ gender })}
                    />
                    <Field
                        id="bornOn"
                        label="Date de naissance"
                        error={errors.bornOn}
                    >
                        <DatePicker
                            id="bornOn"
                            value={form.bornOn}
                            onChange={(bornOn) => patchForm({ bornOn })}
                        />
                    </Field>
                </div>
                <Field
                    id="enrolledOn"
                    label="Date d’inscription"
                    error={errors.enrolledOn}
                >
                    <DatePicker
                        id="enrolledOn"
                        value={form.enrolledOn}
                        onChange={(enrolledOn) => patchForm({ enrolledOn })}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="city" label="Ville" error={errors.city}>
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
                </div>
                <Field id="address" label="Adresse" error={errors.address}>
                    <Input
                        id="address"
                        value={form.address}
                        onChange={(event) =>
                            patchForm({ address: event.target.value })
                        }
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="phone" label="Téléphone" error={errors.phone}>
                        <Input
                            id="phone"
                            value={form.phone}
                            onChange={(event) =>
                                patchForm({ phone: event.target.value })
                            }
                        />
                    </Field>
                    <Field
                        id="email"
                        label="E-mail"
                        error={errors.email}
                        hint={
                            secondary
                                ? 'Obligatoire au collège et au lycée.'
                                : undefined
                        }
                    >
                        <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                                patchForm({ email: event.target.value })
                            }
                        />
                    </Field>
                </div>
            </FormSheet>
        </>
    );
}

StudentIdentityPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Identité' },
    ],
};
