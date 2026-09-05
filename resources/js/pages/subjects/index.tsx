import { Head } from '@inertiajs/react';
import {
    BookOpen,
    EllipsisVertical,
    Hash,
    Layers,
    Paperclip,
    Plus,
    School,
    Tag,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { Field } from '@/components/sms/field';
import { FileListField } from '@/components/sms/file-list-field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchSelect } from '@/components/sms/search-select';
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
import { requiredText } from '@/lib/school-form';
import { dossierFilesOf } from '@/lib/school-files';
import { cycleLabel, isLyceeCycle } from '@/lib/school-rows';
import { needsCoefficient } from '@/lib/school-staff';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroySubject,
    store as storeSubject,
    update as updateSubject,
} from '@/routes/api/v1/subjects';
import { index as subjects } from '@/routes/subjects';
import type { DossierFile, SchoolDataset, Subject } from '@/types/school';

type SubjectForm = {
    code: string;
    name: string;
    textbook: string;
    coefficient: string;
    gradeLevelId: string;
    trackId: string;
};

function blankSubject(gradeLevelId: string): SubjectForm {
    return {
        code: '',
        name: '',
        textbook: '',
        coefficient: '',
        gradeLevelId,
        trackId: '',
    };
}

function subjectSchema(coefRequired: boolean, lycee: boolean) {
    return z.object({
        code: requiredText('Le code'),
        name: requiredText('Le libellé'),
        textbook: z.string(),
        coefficient: coefRequired
            ? z
                  .string()
                  .trim()
                  .min(1, 'Le coefficient est obligatoire à partir du collège.')
                  .refine((value) => {
                      const parsed = Number(value);

                      return Number.isFinite(parsed) && parsed >= 1;
                  }, 'Indiquez un coefficient valide.')
            : z.string().refine((value) => {
                  if (value.trim() === '') {
                      return true;
                  }

                  const parsed = Number(value);

                  return Number.isFinite(parsed) && parsed >= 1;
              }, 'Indiquez un coefficient valide.'),
        gradeLevelId: requiredText('La classe'),
        trackId: lycee
            ? z.string().trim().min(1, 'La série est obligatoire au lycée.')
            : z.string(),
    });
}

export default function SubjectsIndex({ catalog }: { catalog: SchoolDataset }) {
    const { cycle, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [levelId, setLevelId] = useState('all');
    const [items, setItems] = useState<Subject[]>(catalog.subjects);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState<Subject | null>(null);
    const lycee = isLyceeCycle(cycle);
    const coefRequired = needsCoefficient(cycle);
    const levels = catalog.gradeLevels.filter((level) => level.cycle === cycle);
    const tracks = catalog.tracks.filter((track) => track.cycle === cycle);
    const [form, setForm] = useState<SubjectForm>(() =>
        blankSubject(levels[0]?.id ?? ''),
    );
    const [files, setFiles] = useState<DossierFile[]>([]);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLevelId('all');
    }, [cycle]);
    const levelMap = useMemo(
        () => new Map(catalog.gradeLevels.map((level) => [level.id, level])),
        [catalog.gradeLevels],
    );
    const trackMap = useMemo(
        () => new Map(catalog.tracks.map((track) => [track.id, track])),
        [catalog.tracks],
    );
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return items
            .filter((subject) => subject.cycle === cycle)
            .filter((subject) =>
                levelId === 'all' ? true : subject.gradeLevelId === levelId,
            )
            .filter((subject) => {
                const level = levelMap.get(subject.gradeLevelId)?.code ?? '';
                const track = subject.trackId
                    ? (trackMap.get(subject.trackId)?.code ?? '')
                    : '';

                return needle === ''
                    ? true
                    : `${subject.code} ${subject.name} ${level} ${track}`
                          .toLowerCase()
                          .includes(needle);
            });
    }, [cycle, items, levelId, levelMap, search, trackMap]);
    const table = useClientTable(rows);

    function patchForm(patch: Partial<SubjectForm>): void {
        clearErrors(Object.keys(patch));
        setForm((current) => ({ ...current, ...patch }));
    }

    function openCreate(): void {
        setEditingId(null);
        setForm(blankSubject(levels[0]?.id ?? ''));
        setFiles([]);
        clearErrors();
        setOpen(true);
    }

    function openEdit(subject: Subject): void {
        setEditingId(subject.id);
        setForm({
            code: subject.code,
            name: subject.name,
            textbook: subject.textbook ?? '',
            coefficient:
                subject.coefficient === null ? '' : String(subject.coefficient),
            gradeLevelId: subject.gradeLevelId,
            trackId: subject.trackId ?? '',
        });
        setFiles(dossierFilesOf(subject));
        clearErrors();
        setOpen(true);
    }

    function duplicateSubject(subject: Subject): void {
        setEditingId(null);
        setForm({
            code: subject.code,
            name: `${subject.name} (copie)`,
            textbook: subject.textbook ?? '',
            coefficient:
                subject.coefficient === null ? '' : String(subject.coefficient),
            gradeLevelId: subject.gradeLevelId,
            trackId: subject.trackId ?? '',
        });
        setFiles(dossierFilesOf(subject));
        clearErrors();
        setOpen(true);
    }

    async function removeSubject(subject: Subject): Promise<void> {
        try {
            await apiJson(destroySubject.url(subject.id), { method: 'DELETE' });
            setItems((current) =>
                current.filter((item) => item.id !== subject.id),
            );
            toastRemoved(`${subject.name} retirée du programme`);
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(subjectSchema(coefRequired, lycee), form)) {
            return;
        }

        const coefficient =
            form.coefficient.trim() === '' ? null : Number(form.coefficient);

        const payload = {
            code: form.code.trim(),
            name: form.name.trim(),
            textbook: form.textbook.trim() || null,
            coefficient,
            cycle,
            gradeLevelId: form.gradeLevelId,
            trackId: lycee ? form.trackId || null : null,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Subject>(updateSubject.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Subject>(storeSubject.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setItems((current) =>
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
            <Head title="Matières" />
            <ListPage
                title="Matières"
                icon={BookOpen}
                description={`Programme ${cycleLabel(cycle)} · ${academicYearLabel}. Coefficients à partir du collège.`}
                searchPlaceholder="Rechercher une matière..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <SearchSelect
                        value={levelId}
                        onValueChange={setLevelId}
                        className="w-[11rem]"
                        aria-label="Filtrer par classe"
                        placeholder="Toutes les classes"
                        searchPlaceholder="Rechercher une classe..."
                        options={[
                            { value: 'all', label: 'Toutes les classes' },
                            ...levels.map((level) => ({
                                value: level.id,
                                label: level.code,
                            })),
                        ]}
                    />
                }
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Ajouter
                    </Button>
                }
                empty={{
                    title:
                        search.trim() || levelId !== 'all'
                            ? 'Aucun résultat'
                            : 'Aucune matière dans ce cycle',
                    description:
                        search.trim() || levelId !== 'all'
                            ? undefined
                            : `Aucune matière définie pour ${cycleLabel(cycle)}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    Code
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Tag}>
                                    Libellé
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={BookOpen}>
                                    Manuel
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    Coef.
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
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
                                <DataTableColumnHeader icon={Paperclip}>
                                    Fichiers
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
                        {table.pageRows.map((subject) => {
                            const fileCount = dossierFilesOf(subject).length;

                            return (
                                <TableRow key={subject.id}>
                                    <TableCell>
                                        <Badge variant="code">
                                            {subject.code}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {subject.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {subject.textbook ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        {subject.coefficient ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        {levelMap.get(subject.gradeLevelId)
                                            ?.code ?? '—'}
                                    </TableCell>
                                    {lycee ? (
                                        <TableCell>
                                            {subject.trackId
                                                ? (trackMap.get(subject.trackId)
                                                      ?.code ?? '—')
                                                : '—'}
                                        </TableCell>
                                    ) : null}
                                    <TableCell>
                                        {fileCount > 0 ? fileCount : '—'}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onView: () =>
                                                    setViewing(subject),
                                                onEdit: () => openEdit(subject),
                                                onDuplicate: () =>
                                                    duplicateSubject(subject),
                                                onDelete: () =>
                                                    removeSubject(subject),
                                                confirm: {
                                                    title: 'Supprimer la matière ?',
                                                    description: `${subject.name} sera retirée du programme de ce cycle.`,
                                                },
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
                icon={BookOpen}
                title={viewing?.name ?? 'Matière'}
                description={
                    viewing
                        ? `${viewing.code} · ${cycleLabel(viewing.cycle)}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              { label: 'Code', value: viewing.code },
                              {
                                  label: 'Classe',
                                  value:
                                      levelMap.get(viewing.gradeLevelId)
                                          ?.code ?? '—',
                              },
                              {
                                  label: 'Coefficient',
                                  value:
                                      viewing.coefficient ?? 'Sans coefficient',
                              },
                              {
                                  label: 'Série',
                                  value: viewing.trackId
                                      ? (trackMap.get(viewing.trackId)?.code ??
                                        '—')
                                      : '—',
                              },
                              {
                                  label: 'Manuel',
                                  value: viewing.textbook ?? 'Aucun manuel.',
                                  wide: true,
                              },
                              {
                                  label: 'Fichiers pour les enseignants',
                                  value:
                                      dossierFilesOf(viewing).length === 0
                                          ? 'Aucun fichier.'
                                          : dossierFilesOf(viewing)
                                                .map((file) => file.name)
                                                .join(', '),
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier la matière' : 'Nouvelle matière'}
                description={cycleLabel(cycle)}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
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
                <Field id="textbook" label="Manuel">
                    <Input
                        id="textbook"
                        value={form.textbook}
                        onChange={(event) =>
                            patchForm({ textbook: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="coefficient"
                    label="Coefficient"
                    required={coefRequired}
                    error={errors.coefficient}
                    hint={
                        coefRequired
                            ? 'Obligatoire à partir du collège.'
                            : 'Optionnel en préscolaire et primaire.'
                    }
                >
                    <Input
                        id="coefficient"
                        type="number"
                        min={1}
                        required={coefRequired}
                        value={form.coefficient}
                        onChange={(event) =>
                            patchForm({ coefficient: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="gradeLevelId"
                    label="Classe"
                    required
                    error={errors.gradeLevelId}
                >
                    <SearchSelect
                        id="gradeLevelId"
                        className="w-full"
                        value={form.gradeLevelId}
                        placeholder="Choisir une classe"
                        searchPlaceholder="Rechercher une classe..."
                        options={levels.map((level) => ({
                            value: level.id,
                            label: level.code,
                        }))}
                        onValueChange={(value) =>
                            patchForm({ gradeLevelId: value })
                        }
                    />
                </Field>
                <FileListField
                    label="Fichiers pour les enseignants"
                    hint="Programme, polycopiés, exercices — PDF, Word ou image, 5 Mo maximum."
                    files={files}
                    onChange={setFiles}
                />
                {lycee ? (
                    <Field
                        id="trackId"
                        label="Série"
                        required
                        error={errors.trackId}
                    >
                        <Select
                            value={form.trackId || undefined}
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
            </FormSheet>
        </>
    );
}

SubjectsIndex.layout = {
    breadcrumbs: [{ title: 'Matières', href: subjects() }],
};
