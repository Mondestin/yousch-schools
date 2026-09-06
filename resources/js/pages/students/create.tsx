import { Head, router } from '@inertiajs/react';
import {
    FolderOpen,
    GraduationCap,
    MapPin,
    School,
    User,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DatePicker } from '@/components/sms/date-picker';
import { Field } from '@/components/sms/field';
import { FileListField } from '@/components/sms/file-list-field';
import { FormPreview, FormSection } from '@/components/sms/form-layout';
import { FormStepActions, FormSteps } from '@/components/sms/form-steps';
import { GenderSelect } from '@/components/sms/gender-select';
import { PhotoField } from '@/components/sms/photo-field';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { SearchSelect } from '@/components/sms/search-select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import {
    studentContactSchema,
    studentCreateSchema,
    studentGuardianSchema,
    studentIdentitySchema,
    studentSchoolSchema,
} from '@/lib/school-form';
import { cycleLabel, isLyceeCycle, todayIso } from '@/lib/school-rows';
import { z } from 'zod';
import {
    genderLabel,
    guardianRelationLabel,
    nextMatricule,
} from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { store as storeStudent } from '@/routes/api/v1/students';
import { create, index as students } from '@/routes/students';
import type {
    DossierFile,
    Gender,
    GuardianRelation,
    SchoolDataset,
    Student,
} from '@/types/school';

const RELATIONS: GuardianRelation[] = [
    'pere',
    'mere',
    'tuteur',
    'oncle',
    'tante',
    'autre',
];

const STEPS = [
    { id: 'student', title: 'Élève' },
    { id: 'school', title: 'Scolarité' },
    { id: 'contact', title: 'Coordonnées' },
    { id: 'guardian', title: 'Tuteur' },
    { id: 'files', title: 'Dossier' },
] as const;

export default function StudentsCreate({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { filter, query, academicYearLabel, annee } = useSchoolContext();
    const lycee = isLyceeCycle(filter.cycle);
    const matricule = nextMatricule(catalog, annee);
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const tracks = catalog.tracks.filter(
        (track) => track.cycle === filter.cycle,
    );
    const [step, setStep] = useState(0);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [files, setFiles] = useState<DossierFile[]>([]);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [form, setForm] = useState({
        lastName: '',
        firstName: '',
        gender: 'femme' as Gender,
        bornOn: '',
        city: catalog.profile.city,
        neighborhood: '',
        address: '',
        phone: '',
        email: '',
        enrolledOn: todayIso(),
        classroomId: classrooms[0]?.id ?? '',
        trackId: classrooms[0]?.trackId ?? tracks[0]?.id ?? '',
        guardianLastName: '',
        guardianFirstName: '',
        guardianPhone: '',
        guardianProfession: '',
        guardianGender: 'homme' as Gender,
        guardianEmail: '',
        guardianCity: catalog.profile.city,
        guardianNeighborhood: '',
        guardianAddress: '',
        relation: 'pere' as GuardianRelation,
    });

    useEffect(() => {
        return () => {
            if (photoPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const selectedClassroom = useMemo(
        () => classrooms.find((classroom) => classroom.id === form.classroomId),
        [classrooms, form.classroomId],
    );
    const selectedTrack = tracks.find((track) => track.id === form.trackId);
    const fullName = `${form.lastName} ${form.firstName}`.trim();
    const guardianName =
        `${form.guardianLastName} ${form.guardianFirstName}`.trim();
    const stepSchema = [
        studentIdentitySchema,
        studentSchoolSchema(lycee),
        studentContactSchema.omit({ enrolledOn: true }),
        studentGuardianSchema,
        z.object({}),
    ][step];
    const ready = studentCreateSchema(lycee).safeParse(form).success;

    const previewDetails = useMemo(
        () => [
            { label: 'Matricule', value: matricule },
            {
                label: 'Classe',
                value: selectedClassroom?.name ?? 'À choisir',
            },
            {
                label: 'Cycle',
                value: cycleLabel(filter.cycle),
            },
            {
                label: 'Tuteur',
                value:
                    guardianName === ''
                        ? 'À renseigner'
                        : `${guardianName} · ${guardianRelationLabel(form.relation)}`,
            },
            {
                label: 'Dossier',
                value:
                    files.length === 0
                        ? 'Aucune pièce'
                        : `${files.length} fichier${files.length > 1 ? 's' : ''}`,
            },
        ],
        [
            files.length,
            filter.cycle,
            form.relation,
            guardianName,
            matricule,
            selectedClassroom?.name,
        ],
    );

    function patchForm(next: Partial<typeof form>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    function patchClassroom(classroomId: string): void {
        const classroom = classrooms.find((item) => item.id === classroomId);

        patchForm({
            classroomId,
            trackId: classroom?.trackId ?? form.trackId,
        });
    }

    function goNext(): void {
        if (!validate(stepSchema, form)) {
            return;
        }

        setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }

    async function submit(): Promise<void> {
        if (!validate(studentCreateSchema(lycee), form)) {
            return;
        }

        const body = new FormData();
        body.append('matricule', matricule);
        body.append('firstName', form.firstName.trim());
        body.append('lastName', form.lastName.trim());
        body.append('gender', form.gender);
        body.append('bornOn', form.bornOn);
        body.append('city', form.city.trim());
        body.append('neighborhood', form.neighborhood.trim());
        body.append('address', form.address.trim());
        body.append('phone', form.phone.trim());
        body.append('email', form.email.trim());
        body.append('enrolledOn', form.enrolledOn);
        body.append('classroomId', form.classroomId);
        body.append('academicYearId', filter.academicYearId);

        if (lycee && form.trackId) {
            body.append('trackId', form.trackId);
        }

        body.append('guardianFirstName', form.guardianFirstName.trim());
        body.append('guardianLastName', form.guardianLastName.trim());
        body.append('guardianPhone', form.guardianPhone.trim());
        body.append('guardianProfession', form.guardianProfession.trim());
        body.append('guardianGender', form.guardianGender);
        body.append('guardianRelation', form.relation);

        if (photoFile) {
            body.append('photo', photoFile);
        }

        setSaving(true);

        try {
            const saved = await apiData<Student>(storeStudent.url(), {
                method: 'POST',
                formData: body,
            });
            toastSaved(
                `${saved.lastName} ${saved.firstName} : inscription enregistrée`,
            );
            router.visit(students({ query }));
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
            <Head title="Inscription" />
            <PageShell>
                <PageHeader
                    title="Nouvelle inscription"
                    icon={GraduationCap}
                    description={`${cycleLabel(filter.cycle)} · ${academicYearLabel}. Le résumé se met à jour au fil de la saisie.`}
                />
                <form
                    className="flex min-h-0 flex-1 flex-col gap-6"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (step < STEPS.length - 1) {
                            goNext();

                            return;
                        }

                        void submit();
                    }}
                >
                    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="grid gap-6">
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
                                <FormSection
                                    icon={User}
                                    title="Élève"
                                    description="Photo, identité et date de naissance."
                                >
                                    <div className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start">
                                        <PhotoField
                                            preview={photoPreview}
                                            fallback={GraduationCap}
                                            size="lg"
                                            onFile={(file) => {
                                                if (
                                                    photoPreview?.startsWith(
                                                        'blob:',
                                                    )
                                                ) {
                                                    URL.revokeObjectURL(
                                                        photoPreview,
                                                    );
                                                }

                                                setPhotoFile(file);
                                                setPhotoPreview(
                                                    file
                                                        ? URL.createObjectURL(
                                                              file,
                                                          )
                                                        : null,
                                                );
                                            }}
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                            <Field
                                                id="matricule"
                                                label="Matricule"
                                            >
                                                <Input
                                                    id="matricule"
                                                    value={matricule}
                                                    readOnly
                                                />
                                            </Field>
                                            <Field
                                                id="lastName"
                                                label="Nom"
                                                required
                                                error={errors.lastName}
                                            >
                                                <Input
                                                    id="lastName"
                                                    value={form.lastName}
                                                    required
                                                    onChange={(event) =>
                                                        patchForm({
                                                            lastName:
                                                                event.target
                                                                    .value,
                                                        })
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
                                                    required
                                                    onChange={(event) =>
                                                        patchForm({
                                                            firstName:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <GenderSelect
                                                value={form.gender}
                                                required
                                                error={errors.gender}
                                                onChange={(value) =>
                                                    patchForm({
                                                        gender: value,
                                                    })
                                                }
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
                                                    required
                                                    onChange={(value) =>
                                                        patchForm({
                                                            bornOn: value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                </FormSection>
                            ) : null}

                            {step === 1 ? (
                                <FormSection
                                    icon={School}
                                    title="Scolarité"
                                    description="Classe d’accueil et date d’inscription."
                                >
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                                                options={classrooms.map(
                                                    (classroom) => ({
                                                        value: classroom.id,
                                                        label: classroom.name,
                                                    }),
                                                )}
                                                onValueChange={patchClassroom}
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
                                                    value={
                                                        form.trackId ||
                                                        undefined
                                                    }
                                                    onValueChange={(value) =>
                                                        patchForm({
                                                            trackId: value,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger id="trackId">
                                                        <SelectValue placeholder="Choisir une série" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tracks.map((track) => (
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
                                            id="enrolledOn"
                                            label="Date d’inscription"
                                            required
                                            error={errors.enrolledOn}
                                        >
                                            <DatePicker
                                                id="enrolledOn"
                                                value={form.enrolledOn}
                                                required
                                                onChange={(value) =>
                                                    patchForm({
                                                        enrolledOn: value,
                                                    })
                                                }
                                            />
                                        </Field>
                                    </div>
                                    {selectedClassroom?.trackId ? (
                                        <p className="text-muted-foreground mt-3 text-[13px]">
                                            Série de la classe :{' '}
                                            {tracks.find(
                                                (track) =>
                                                    track.id ===
                                                    selectedClassroom.trackId,
                                            )?.code ?? '-'}
                                        </p>
                                    ) : null}
                                </FormSection>
                            ) : null}

                            {step === 2 ? (
                                <FormSection
                                    icon={MapPin}
                                    title="Coordonnées"
                                    description="Adresse et contacts de l’élève."
                                >
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <Field
                                            id="city"
                                            label="Ville"
                                            required
                                            error={errors.city}
                                        >
                                            <Input
                                                id="city"
                                                value={form.city}
                                                required
                                                onChange={(event) =>
                                                    patchForm({
                                                        city: event.target
                                                            .value,
                                                    })
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
                                                required
                                                onChange={(event) =>
                                                    patchForm({
                                                        neighborhood:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field id="address" label="Adresse">
                                            <Input
                                                id="address"
                                                value={form.address}
                                                onChange={(event) =>
                                                    patchForm({
                                                        address:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field id="phone" label="Téléphone">
                                            <Input
                                                id="phone"
                                                value={form.phone}
                                                onChange={(event) =>
                                                    patchForm({
                                                        phone: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="email"
                                            label="E-mail"
                                            error={errors.email}
                                        >
                                            <Input
                                                id="email"
                                                type="email"
                                                value={form.email}
                                                onChange={(event) =>
                                                    patchForm({
                                                        email: event.target
                                                            .value,
                                                    })
                                                }
                                            />
                                        </Field>
                                    </div>
                                </FormSection>
                            ) : null}

                            {step === 3 ? (
                                <FormSection
                                    icon={Users}
                                    title="Tuteur"
                                    description="Personne responsable à contacter."
                                >
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <Field
                                            id="guardianLastName"
                                            label="Nom"
                                            required
                                            error={errors.guardianLastName}
                                        >
                                            <Input
                                                id="guardianLastName"
                                                value={form.guardianLastName}
                                                required
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianLastName:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="guardianFirstName"
                                            label="Prénom"
                                            required
                                            error={errors.guardianFirstName}
                                        >
                                            <Input
                                                id="guardianFirstName"
                                                value={form.guardianFirstName}
                                                required
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianFirstName:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="relation"
                                            label="Lien"
                                            required
                                            error={errors.relation}
                                        >
                                            <Select
                                                value={form.relation}
                                                onValueChange={(value) =>
                                                    patchForm({
                                                        relation:
                                                            value as GuardianRelation,
                                                    })
                                                }
                                            >
                                                <SelectTrigger id="relation">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {RELATIONS.map(
                                                        (relation) => (
                                                            <SelectItem
                                                                key={relation}
                                                                value={relation}
                                                            >
                                                                {guardianRelationLabel(
                                                                    relation,
                                                                )}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field
                                            id="guardianPhone"
                                            label="Téléphone"
                                            required
                                            error={errors.guardianPhone}
                                        >
                                            <Input
                                                id="guardianPhone"
                                                value={form.guardianPhone}
                                                required
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianPhone:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="guardianProfession"
                                            label="Profession"
                                            required
                                            error={errors.guardianProfession}
                                        >
                                            <Input
                                                id="guardianProfession"
                                                value={form.guardianProfession}
                                                required
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianProfession:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <GenderSelect
                                            id="guardianGender"
                                            value={form.guardianGender}
                                            onChange={(value) =>
                                                patchForm({
                                                    guardianGender: value,
                                                })
                                            }
                                        />
                                        <Field
                                            id="guardianEmail"
                                            label="E-mail"
                                            error={errors.guardianEmail}
                                        >
                                            <Input
                                                id="guardianEmail"
                                                type="email"
                                                value={form.guardianEmail}
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianEmail:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field id="guardianCity" label="Ville">
                                            <Input
                                                id="guardianCity"
                                                value={form.guardianCity}
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianCity:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="guardianNeighborhood"
                                            label="Quartier"
                                        >
                                            <Input
                                                id="guardianNeighborhood"
                                                value={
                                                    form.guardianNeighborhood
                                                }
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianNeighborhood:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                        <Field
                                            id="guardianAddress"
                                            label="Adresse"
                                        >
                                            <Input
                                                id="guardianAddress"
                                                value={form.guardianAddress}
                                                onChange={(event) =>
                                                    patchForm({
                                                        guardianAddress:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        </Field>
                                    </div>
                                </FormSection>
                            ) : null}

                            {step === 4 ? (
                                <FormSection
                                    icon={FolderOpen}
                                    title="Dossier"
                                    description="Extrait de naissance, photos, carnet, certificat."
                                >
                                    <FileListField
                                        label="Pièces de l’élève"
                                        files={files}
                                        onChange={setFiles}
                                    />
                                </FormSection>
                            ) : null}
                        </div>

                        <FormPreview
                            photoUrl={photoPreview}
                            name={fullName}
                            fallback="Nouvel élève"
                            hint={genderLabel(form.gender)}
                            details={previewDetails}
                        >
                            <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
                                <Badge variant="code">
                                    {selectedTrack?.code ??
                                        selectedClassroom?.code ??
                                        cycleLabel(filter.cycle)}
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
                            total={STEPS.length}
                            submitLabel={saving ? 'Enregistrement…' : 'Créer'}
                            disabled={saving}
                            onCancel={() => router.visit(students({ query }))}
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

StudentsCreate.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Inscription', href: create() },
    ],
};
