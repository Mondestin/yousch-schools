import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { DetailSectionCard } from '@/components/sms/person-profile-header';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { InfoField } from '@/components/sms/info-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useYearLock } from '@/hooks/use-year-lock';
import { useSchoolContext } from '@/hooks/use-school-context';
import { studentPreviousAcademicSchema } from '@/lib/school-form';
import { studentFiche } from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { update as updateStudent } from '@/routes/api/v1/students';
import { index as students } from '@/routes/students';
import type { SchoolDataset, Student } from '@/types/school';

export default function StudentPreviousPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { locked, canMutate } = useYearLock();
    const { filter } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);
    const [student, setStudent] = useState(fiche?.student ?? null);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [form, setForm] = useState({
        isTransfer: fiche?.student.isTransfer ?? false,
        previousSchoolName: fiche?.student.previousSchoolName ?? '',
        previousAcademicYear: fiche?.student.previousAcademicYear ?? '',
        previousClass: fiche?.student.previousClass ?? '',
        previousSchoolCity: fiche?.student.previousSchoolCity ?? '',
    });

    if (!fiche || !student) {
        return null;
    }

    const current = student;

    function openEdit(): void {
        setForm({
            isTransfer: current.isTransfer ?? false,
            previousSchoolName: current.previousSchoolName ?? '',
            previousAcademicYear: current.previousAcademicYear ?? '',
            previousClass: current.previousClass ?? '',
            previousSchoolCity: current.previousSchoolCity ?? '',
        });
        clearErrors();
        setOpen(true);
    }

    async function save(): Promise<void> {
        if (!validate(studentPreviousAcademicSchema, form)) {
            return;
        }

        setSaving(true);

        try {
            const saved = await apiData<Student>(updateStudent.url(studentId), {
                method: 'PUT',
                body: {
                    firstName: current.firstName,
                    lastName: current.lastName,
                    gender: current.gender,
                    bornOn: current.bornOn,
                    city: current.city,
                    neighborhood: current.neighborhood,
                    phone: current.phone,
                    email: current.email,
                    address: current.address,
                    enrolledOn: current.enrolledOn,
                    isTransfer: form.isTransfer,
                    previousSchoolName:
                        form.previousSchoolName.trim() || null,
                    previousAcademicYear:
                        form.previousAcademicYear.trim() || null,
                    previousClass: form.previousClass.trim() || null,
                    previousSchoolCity:
                        form.previousSchoolCity.trim() || null,
                },
            });
            setStudent(saved);
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
            <Head title={`${fiche.name} : Parcours`} />
            <DetailSectionCard
                title="Parcours antérieur"
                description="Transfert ou scolarisation dans un autre établissement."
                action={
                    canMutate && !locked ? (
                        <Button type="button" onClick={openEdit}>
                            Modifier
                        </Button>
                    ) : null
                }
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoField
                        label="Transfert"
                        value={
                            current.isTransfer
                                ? 'Oui (déjà scolarisé ailleurs)'
                                : 'Non'
                        }
                    />
                    <InfoField
                        label="Établissement précédent"
                        value={current.previousSchoolName}
                    />
                    <InfoField
                        label="Année scolaire précédente"
                        value={current.previousAcademicYear}
                    />
                    <InfoField
                        label="Classe / niveau précédent"
                        value={current.previousClass}
                    />
                    <InfoField
                        label="Ville de l’établissement"
                        value={current.previousSchoolCity}
                    />
                </div>
            </DetailSectionCard>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title="Modifier le parcours"
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="isTransfer"
                        checked={form.isTransfer}
                        onCheckedChange={(checked) => {
                            clearErrors(['isTransfer']);
                            setForm((current) => ({
                                ...current,
                                isTransfer: checked === true,
                            }));
                        }}
                    />
                    <Label htmlFor="isTransfer">
                        Élève déjà scolarisé ailleurs (transfert)
                    </Label>
                </div>
                <Field
                    id="previousSchoolName"
                    label="Établissement précédent"
                    error={errors.previousSchoolName}
                >
                    <Input
                        id="previousSchoolName"
                        value={form.previousSchoolName}
                        onChange={(event) => {
                            clearErrors(['previousSchoolName']);
                            setForm((current) => ({
                                ...current,
                                previousSchoolName: event.target.value,
                            }));
                        }}
                    />
                </Field>
                <Field
                    id="previousAcademicYear"
                    label="Année scolaire précédente"
                    error={errors.previousAcademicYear}
                >
                    <Input
                        id="previousAcademicYear"
                        value={form.previousAcademicYear}
                        onChange={(event) => {
                            clearErrors(['previousAcademicYear']);
                            setForm((current) => ({
                                ...current,
                                previousAcademicYear: event.target.value,
                            }));
                        }}
                    />
                </Field>
                <Field
                    id="previousClass"
                    label="Classe / niveau précédent"
                    error={errors.previousClass}
                >
                    <Input
                        id="previousClass"
                        value={form.previousClass}
                        onChange={(event) => {
                            clearErrors(['previousClass']);
                            setForm((current) => ({
                                ...current,
                                previousClass: event.target.value,
                            }));
                        }}
                    />
                </Field>
                <Field
                    id="previousSchoolCity"
                    label="Ville de l’établissement"
                    error={errors.previousSchoolCity}
                >
                    <Input
                        id="previousSchoolCity"
                        value={form.previousSchoolCity}
                        onChange={(event) => {
                            clearErrors(['previousSchoolCity']);
                            setForm((current) => ({
                                ...current,
                                previousSchoolCity: event.target.value,
                            }));
                        }}
                    />
                </Field>
            </FormSheet>
        </>
    );
}

StudentPreviousPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Fiche', href: students() },
    ],
};
