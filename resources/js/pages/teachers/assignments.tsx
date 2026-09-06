import { Head } from '@inertiajs/react';
import { Briefcase, Pencil, Plus, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { RowMenu } from '@/components/sms/row-menu';
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
import { isLyceeCycle } from '@/lib/school-rows';
import { z } from 'zod';
import { teacherFiche } from '@/lib/school-staff';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyAssignment,
    store as storeAssignment,
    update as updateAssignment,
} from '@/routes/api/v1/teacher-assignments';
import { index as teachers } from '@/routes/teachers';
import type {
    SchoolDataset,
    TeacherAssignment,
} from '@/types/school';

export default function TeacherAssignmentsPage({
    catalog,
    teacherId,
}: {
    catalog: SchoolDataset;
    teacherId: string;
}) {
    const { filter } = useSchoolContext();
    const teacher = catalog.teachers.find((item) => item.id === teacherId);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>(
        catalog.teacherAssignments,
    );
    const { errors, clearErrors, showErrors } = useFieldErrors();
    const [savingAssign, setSavingAssign] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
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
            <Head title={`${fiche.name} : Affectations`} />
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold">Affectations</h2>
                <Button type="button" onClick={openAssign}>
                    <Plus />
                    Ajouter
                </Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-[8px] border">
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
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fiche.assignments.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.yearLabel}</TableCell>
                                    <TableCell>{row.classroom}</TableCell>
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
                                    <TableCell>{row.cycleName}</TableCell>
                                    <TableCell>
                                        <RowMenu
                                            items={[
                                                {
                                                    label: 'Modifier l’affectation',
                                                    icon: Pencil,
                                                    onSelect: () =>
                                                        openEditAssign(row.id),
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

TeacherAssignmentsPage.layout = {
    breadcrumbs: [
        { title: 'Enseignants', href: teachers() },
        { title: 'Fiche', href: teachers() },
    ],
};
