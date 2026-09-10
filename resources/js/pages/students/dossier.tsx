import { Head } from '@inertiajs/react';
import { GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DetailSectionCard } from '@/components/sms/person-profile-header';
import { FileListField } from '@/components/sms/file-list-field';
import { FormSheet } from '@/components/sms/form-sheet';
import { PhotoField } from '@/components/sms/photo-field';
import { Button } from '@/components/ui/button';
import { useYearLock } from '@/hooks/use-year-lock';
import { useSchoolContext } from '@/hooks/use-school-context';
import { dossierFilesOf } from '@/lib/school-files';
import { studentFiche } from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { apiData } from '@/lib/api';
import { update as updateStudent } from '@/routes/api/v1/students';
import { index as students } from '@/routes/students';
import type { DossierFile, SchoolDataset, Student } from '@/types/school';

function studentUpdateFormData(
    student: Student,
    options: { photo?: File | null; files?: File[] },
): FormData {
    const body = new FormData();
    const payload = {
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        bornOn: student.bornOn,
        city: student.city,
        neighborhood: student.neighborhood,
        phone: student.phone,
        email: student.email,
        address: student.address,
        enrolledOn: student.enrolledOn,
        isTransfer: student.isTransfer ?? false,
        previousSchoolName: student.previousSchoolName,
        previousAcademicYear: student.previousAcademicYear,
        previousClass: student.previousClass,
        previousSchoolCity: student.previousSchoolCity,
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

    for (const file of options.files ?? []) {
        body.append('files[]', file);
    }

    return body;
}

export default function StudentDossierPage({
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
    const [files, setFiles] = useState<DossierFile[]>(
        dossierFilesOf(fiche?.student),
    );
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        fiche?.student.photoUrl ?? null,
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);

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
        setFiles(dossierFilesOf(current));
        setPendingFiles([]);
        setPhotoPreview(current.photoUrl);
        setPhotoFile(null);
        setOpen(true);
    }

    async function save(): Promise<void> {
        if (!photoFile && pendingFiles.length === 0) {
            setOpen(false);

            return;
        }

        setSaving(true);

        try {
            const saved = await apiData<Student>(updateStudent.url(studentId), {
                method: 'PUT',
                formData: studentUpdateFormData(current, {
                    photo: photoFile,
                    files: pendingFiles,
                }),
            });
            setStudent(saved);
            setFiles(dossierFilesOf(saved));
            setPendingFiles([]);
            setPhotoPreview(saved.photoUrl);
            setPhotoFile(null);
            setOpen(false);
            toastSaved();
        } catch (error) {
            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title={`${fiche.name} : Dossier`} />
            <DetailSectionCard
                title="Dossier de l’élève"
                description="Photo et pièces jointes administratives."
                action={
                    canMutate && !locked ? (
                        <Button type="button" onClick={openEdit}>
                            Modifier
                        </Button>
                    ) : null
                }
            >
                <div className="mb-5 flex items-center gap-4">
                    {photoPreview ? (
                        <img
                            src={photoPreview}
                            alt=""
                            className="size-20 rounded-[12px] border object-cover"
                        />
                    ) : (
                        <div className="bg-primary/10 text-primary flex size-20 items-center justify-center rounded-[12px]">
                            <GraduationCap className="size-8" />
                        </div>
                    )}
                    <div>
                        <p className="text-[14px] font-medium">{fiche.name}</p>
                        <p className="text-muted-foreground text-[12px]">
                            {files.length} pièce
                            {files.length === 1 ? '' : 's'} jointe
                            {files.length === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>
                <FileListField files={files} />
            </DetailSectionCard>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title="Modifier le dossier"
                description="Photo et pièces - PDF ou image, 5 Mo maximum."
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
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
                <FileListField
                    label="Pièces"
                    hint="Ajoutez des fichiers au dossier de l’élève."
                    files={files}
                    onChange={setFiles}
                    onNativeFiles={(incoming) =>
                        setPendingFiles((current) => [
                            ...current,
                            ...incoming,
                        ])
                    }
                />
            </FormSheet>
        </>
    );
}

StudentDossierPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Fiche', href: students() },
    ],
};
