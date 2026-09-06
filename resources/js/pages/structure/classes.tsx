import { Head } from '@inertiajs/react';
import {
    EllipsisVertical,
    Hash,
    Layers,
    Plus,
    School,
    Tag,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useSchoolContext } from '@/hooks/use-school-context';
import { crudItems } from '@/lib/school-crud';
import { requiredInt, requiredText } from '@/lib/school-form';
import { cycleLabel, isLyceeCycle } from '@/lib/school-rows';
import { classroomLabels } from '@/lib/school-structure';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyClassroom,
    store as storeClassroom,
    update as updateClassroom,
} from '@/routes/api/v1/classrooms';
import {
    classes as classesRoute,
    index as yearsRoute,
} from '@/routes/structure';
import type { Classroom, SchoolDataset } from '@/types/school';

type ClassroomForm = {
    gradeLevelId: string;
    section: string | null;
    trackId: string | null;
    code: string;
    name: string;
    capacity: number;
};

type ClassroomRow = Classroom & { level: string; track: string | null };

function classroomSchema(lycee: boolean) {
    return z.object({
        gradeLevelId: requiredText('Le niveau'),
        section: z.string().nullable(),
        trackId: lycee
            ? z.string().trim().min(1, 'Choisissez une série pour le lycée.')
            : z.string(),
        code: requiredText('Le code'),
        name: requiredText('Le libellé'),
        capacity: requiredInt('La capacité', 1),
    });
}

export default function StructureClassesPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { filter, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [classrooms, setClassrooms] = useState<Classroom[]>(
        catalog.classrooms,
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState<ClassroomRow | null>(null);
    const [form, setForm] = useState<ClassroomForm>(() =>
        blankClassroom(catalog, filter.cycle),
    );
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();

    const levels = catalog.gradeLevels.filter(
        (level) => level.cycle === filter.cycle,
    );
    const tracks = catalog.tracks.filter(
        (track) => track.cycle === filter.cycle,
    );
    const lycee = isLyceeCycle(filter.cycle);

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        const levelMap = new Map(
            catalog.gradeLevels.map((level) => [level.id, level]),
        );
        const trackMap = new Map(
            catalog.tracks.map((track) => [track.id, track]),
        );

        return classrooms
            .filter(
                (classroom) =>
                    classroom.cycle === filter.cycle &&
                    classroom.academicYearId === filter.academicYearId,
            )
            .map((classroom) => ({
                ...classroom,
                level: levelMap.get(classroom.gradeLevelId)?.code ?? '-',
                track: classroom.trackId
                    ? (trackMap.get(classroom.trackId)?.code ?? null)
                    : null,
            }))
            .filter((classroom) =>
                query === ''
                    ? true
                    : `${classroom.name} ${classroom.code} ${classroom.level} ${classroom.track ?? ''} ${classroom.section ?? ''}`
                          .toLowerCase()
                          .includes(query),
            );
    }, [catalog, classrooms, filter, search]);
    const table = useClientTable(rows);

    function openCreate(): void {
        setEditingId(null);
        setForm(blankClassroom(catalog, filter.cycle));
        clearErrors();
        setOpen(true);
    }

    function openEdit(classroom: Classroom): void {
        setEditingId(classroom.id);
        setForm({
            gradeLevelId: classroom.gradeLevelId,
            section: classroom.section,
            trackId: classroom.trackId,
            code: classroom.code,
            name: classroom.name,
            capacity: classroom.capacity,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicateClassroom(classroom: Classroom): void {
        const section = classroom.section === 'A' ? 'B' : 'A';

        setEditingId(null);
        setForm(
            deriveLabels(
                catalog,
                {
                    gradeLevelId: classroom.gradeLevelId,
                    section,
                    trackId: classroom.trackId,
                    code: classroom.code,
                    name: classroom.name,
                    capacity: classroom.capacity,
                },
                { section },
            ),
        );
        clearErrors();
        setOpen(true);
    }

    async function removeClassroom(classroom: Classroom): Promise<void> {
        try {
            await apiJson(destroyClassroom.url(classroom.id), {
                method: 'DELETE',
            });
            setClassrooms((current) =>
                current.filter((item) => item.id !== classroom.id),
            );
            toastRemoved(`Classe ${classroom.name} supprimée`);
        } catch (error) {
            toastApiError(error);
        }
    }

    function patchForm(patch: Partial<ClassroomForm>): void {
        clearErrors(Object.keys(patch));
        setForm((current) =>
            deriveLabels(catalog, { ...current, ...patch }, patch),
        );
    }

    async function saveClassroom(): Promise<void> {
        if (
            !validate(classroomSchema(lycee), {
                gradeLevelId: form.gradeLevelId,
                section: form.section,
                trackId: form.trackId ?? '',
                code: form.code,
                name: form.name,
                capacity: Number.isFinite(form.capacity)
                    ? String(form.capacity)
                    : '',
            })
        ) {
            return;
        }

        const payload = {
            academicYearId: filter.academicYearId,
            cycle: filter.cycle,
            gradeLevelId: form.gradeLevelId,
            trackId: lycee ? form.trackId : null,
            code: form.code.trim(),
            name: form.name.trim(),
            section: form.section,
            capacity: form.capacity,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Classroom>(updateClassroom.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Classroom>(storeClassroom.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setClassrooms((current) =>
                editingId
                    ? current.map((item) =>
                          item.id === editingId ? saved : item,
                      )
                    : [saved, ...current],
            );
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
            <Head title="Classes" />
            <ListPage
                embedded
                title="Classes"
                icon={School}
                description={`Classes ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                searchPlaceholder="Rechercher une classe..."
                search={search}
                onSearchChange={setSearch}
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Ajouter
                    </Button>
                }
                empty={{
                    title: search.trim()
                        ? 'Aucun résultat'
                        : 'Aucune classe dans ce cycle',
                    description: search.trim()
                        ? undefined
                        : `Aucune classe en ${cycleLabel(filter.cycle)} pour ${academicYearLabel}.`,
                    icon: School,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    Code
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Layers}>
                                    Niveau
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Tag}>
                                    Section
                                </DataTableColumnHeader>
                            </TableHead>
                            {lycee ? (
                                <TableHead>
                                    <DataTableColumnHeader icon={Layers}>
                                        Série
                                    </DataTableColumnHeader>
                                </TableHead>
                            ) : null}
                            <TableHead>
                                <DataTableColumnHeader icon={Users}>
                                    Capacité
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead className="w-14 text-center">
                                <DataTableColumnHeader icon={EllipsisVertical}>
                                    Actions
                                </DataTableColumnHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((classroom) => (
                            <TableRow key={classroom.id}>
                                <TableCell className="font-medium">
                                    {classroom.name}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="code">
                                        {classroom.code}
                                    </Badge>
                                </TableCell>
                                <TableCell>{classroom.level}</TableCell>
                                <TableCell>
                                    {classroom.section ?? '-'}
                                </TableCell>
                                {lycee ? (
                                    <TableCell>
                                        {classroom.track ?? '-'}
                                    </TableCell>
                                ) : null}
                                <TableCell>{classroom.capacity}</TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => setViewing(classroom),
                                            onEdit: () => openEdit(classroom),
                                            onDuplicate: () =>
                                                duplicateClassroom(classroom),
                                            onDelete: () =>
                                                removeClassroom(classroom),
                                            confirm: {
                                                title: 'Supprimer la classe ?',
                                                description: `La classe ${classroom.name} sera retirée de cette année scolaire.`,
                                            },
                                        })}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                icon={School}
                title={viewing?.name ?? 'Classe'}
                description={
                    viewing
                        ? `${cycleLabel(viewing.cycle)} · ${academicYearLabel}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              { label: 'Code', value: viewing.code },
                              { label: 'Niveau', value: viewing.level },
                              {
                                  label: 'Section',
                                  value: viewing.section ?? 'Aucune',
                              },
                              {
                                  label: 'Série',
                                  value: viewing.track ?? '-',
                              },
                              {
                                  label: 'Capacité',
                                  value: `${viewing.capacity} places`,
                              },
                              {
                                  label: 'Année scolaire',
                                  value: academicYearLabel,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier la classe' : 'Nouvelle classe'}
                description={`${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void saveClassroom();
                }}
            >
                <Field
                    id="gradeLevelId"
                    label="Niveau"
                    required
                    error={errors.gradeLevelId}
                >
                    <Select
                        value={form.gradeLevelId}
                        onValueChange={(value) =>
                            patchForm({ gradeLevelId: value })
                        }
                    >
                        <SelectTrigger id="gradeLevelId" className="w-full">
                            <SelectValue placeholder="Choisir un niveau" />
                        </SelectTrigger>
                        <SelectContent>
                            {levels.map((level) => (
                                <SelectItem key={level.id} value={level.id}>
                                    {level.code}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="section" label="Section">
                    <Select
                        value={form.section ?? 'none'}
                        onValueChange={(value) =>
                            patchForm({
                                section: value === 'none' ? null : value,
                            })
                        }
                    >
                        <SelectTrigger id="section" className="w-full">
                            <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                {lycee ? (
                    <Field
                        id="trackId"
                        label="Série"
                        required
                        error={errors.trackId}
                    >
                        <Select
                            value={form.trackId ?? undefined}
                            onValueChange={(value) =>
                                patchForm({ trackId: value })
                            }
                        >
                            <SelectTrigger id="trackId" className="w-full">
                                <SelectValue placeholder="Choisir une série" />
                            </SelectTrigger>
                            <SelectContent>
                                {tracks.map((track) => (
                                    <SelectItem key={track.id} value={track.id}>
                                        {track.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                ) : null}
                <Field id="code" label="Code" required error={errors.code}>
                    <Input
                        id="code"
                        value={form.code}
                        required
                        onChange={(event) =>
                            patchForm({ code: event.target.value })
                        }
                    />
                </Field>
                <Field id="name" label="Libellé" required error={errors.name}>
                    <Input
                        id="name"
                        value={form.name}
                        required
                        onChange={(event) =>
                            patchForm({ name: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="capacity"
                    label="Capacité"
                    required
                    error={errors.capacity}
                >
                    <Input
                        id="capacity"
                        type="number"
                        min={1}
                        required
                        value={
                            Number.isFinite(form.capacity) ? form.capacity : ''
                        }
                        onChange={(event) =>
                            patchForm({
                                capacity: Number(event.target.value),
                            })
                        }
                    />
                </Field>
            </FormSheet>
        </>
    );
}

function blankClassroom(
    catalog: SchoolDataset,
    cycle: SchoolDataset['gradeLevels'][number]['cycle'],
): ClassroomForm {
    const levels = catalog.gradeLevels.filter((level) => level.cycle === cycle);
    const tracks = catalog.tracks.filter((track) => track.cycle === cycle);
    const lycee = isLyceeCycle(cycle);

    return deriveLabels(
        catalog,
        {
            gradeLevelId: levels[0]?.id ?? '',
            section: lycee ? null : 'A',
            trackId: lycee ? (tracks[0]?.id ?? null) : null,
            code: '',
            name: '',
            capacity: 40,
        },
        { gradeLevelId: levels[0]?.id ?? '' },
    );
}

function deriveLabels(
    catalog: SchoolDataset,
    form: ClassroomForm,
    patch: Partial<ClassroomForm>,
): ClassroomForm {
    const shouldDerive =
        patch.gradeLevelId !== undefined ||
        patch.section !== undefined ||
        patch.trackId !== undefined;

    if (!shouldDerive) {
        return form;
    }

    const level = catalog.gradeLevels.find(
        (item) => item.id === form.gradeLevelId,
    );
    const track = form.trackId
        ? catalog.tracks.find((item) => item.id === form.trackId)
        : null;

    if (!level) {
        return form;
    }

    const labels = classroomLabels(
        level.code,
        form.section,
        track?.code ?? null,
    );

    return { ...form, code: labels.code, name: labels.name };
}

StructureClassesPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Classes', href: classesRoute() },
    ],
};
