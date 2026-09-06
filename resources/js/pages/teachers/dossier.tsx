import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { FileListField } from '@/components/sms/file-list-field';
import { FormSheet } from '@/components/sms/form-sheet';
import { teacherFormData, teacherToForm } from '@/components/sms/teacher-form';
import { Button } from '@/components/ui/button';
import { dossierFilesOf } from '@/lib/school-files';
import { teacherFiche } from '@/lib/school-staff';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { apiData } from '@/lib/api';
import { update as updateTeacher } from '@/routes/api/v1/teachers';
import { index as teachers } from '@/routes/teachers';
import type { DossierFile, SchoolDataset, Teacher } from '@/types/school';

export default function TeacherDossierPage({
    catalog,
    teacherId,
}: {
    catalog: SchoolDataset;
    teacherId: string;
}) {
    const fiche = teacherFiche(catalog, teacherId);
    const [teacher, setTeacher] = useState<Teacher | null>(
        fiche?.teacher ?? null,
    );
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [files, setFiles] = useState<DossierFile[]>(dossierFilesOf(teacher));
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    if (!teacher || !fiche) {
        return null;
    }

    const current = teacher;

    function openEdit(): void {
        setFiles(dossierFilesOf(current));
        setPendingFiles([]);
        setOpen(true);
    }

    async function save(): Promise<void> {
        if (pendingFiles.length === 0) {
            setOpen(false);

            return;
        }

        setSaving(true);

        try {
            const saved = await apiData<Teacher>(updateTeacher.url(teacherId), {
                method: 'PUT',
                formData: teacherFormData(teacherToForm(current), {
                    files: pendingFiles,
                }),
            });
            setTeacher(saved);
            setFiles(dossierFilesOf(saved));
            setPendingFiles([]);
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
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold">Dossier</h2>
                <Button type="button" onClick={openEdit}>
                    Modifier
                </Button>
            </div>
            <div className="mt-4 max-w-3xl">
                <FileListField files={dossierFilesOf(teacher)} />
            </div>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title="Modifier le dossier"
                description="CV, diplôme, contrat - PDF, Word ou image, 5 Mo maximum."
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <FileListField
                    label="Pièces"
                    hint="Ajoutez des fichiers au dossier de l’enseignant."
                    files={files}
                    onChange={setFiles}
                    onNativeFiles={(incoming) =>
                        setPendingFiles((currentFiles) => [
                            ...currentFiles,
                            ...incoming,
                        ])
                    }
                />
            </FormSheet>
        </>
    );
}

TeacherDossierPage.layout = {
    breadcrumbs: [
        { title: 'Enseignants', href: teachers() },
        { title: 'Fiche', href: teachers() },
    ],
};
