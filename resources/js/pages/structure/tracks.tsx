import { Head } from '@inertiajs/react';
import { EllipsisVertical, Hash, Layers, Plus, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { CycleBadge } from '@/components/sms/code-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cycleLabel, isLyceeCycle } from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyTrack,
    store as storeTrack,
    update as updateTrack,
} from '@/routes/api/v1/tracks';
import { index as yearsRoute, tracks as tracksRoute } from '@/routes/structure';
import type { SchoolDataset, Track } from '@/types/school';

type TrackForm = {
    code: string;
    name: string;
};

const trackSchema = z.object({
    code: requiredText('Le code'),
    name: requiredText('Le libellé'),
});

export default function StructureTracksPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { cycle } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [tracks, setTracks] = useState<Track[]>(catalog.tracks);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState<Track | null>(null);
    const [form, setForm] = useState<TrackForm>({ code: '', name: '' });
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const lycee = isLyceeCycle(cycle);

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();

        return tracks
            .filter((track) => track.cycle === cycle)
            .filter((track) =>
                query === ''
                    ? true
                    : `${track.code} ${track.name}`
                          .toLowerCase()
                          .includes(query),
            );
    }, [cycle, search, tracks]);
    const table = useClientTable(rows);

    function patchForm(patch: Partial<TrackForm>): void {
        clearErrors(Object.keys(patch));
        setForm((current) => ({ ...current, ...patch }));
    }

    function openCreate(): void {
        setEditingId(null);
        setForm({ code: '', name: '' });
        clearErrors();
        setOpen(true);
    }

    function openEdit(track: Track): void {
        setEditingId(track.id);
        setForm({ code: track.code, name: track.name });
        clearErrors();
        setOpen(true);
    }

    function duplicateTrack(track: Track): void {
        setEditingId(null);
        setForm({ code: '', name: `${track.name} (copie)` });
        clearErrors();
        setOpen(true);
    }

    async function removeTrack(track: Track): Promise<void> {
        try {
            await apiJson(destroyTrack.url(track.id), { method: 'DELETE' });
            setTracks((current) =>
                current.filter((item) => item.id !== track.id),
            );
            toastRemoved(`Série ${track.name} supprimée`);
        } catch (error) {
            toastApiError(error);
        }
    }

    async function saveTrack(): Promise<void> {
        if (!validate(trackSchema, form)) {
            return;
        }

        if (!isLyceeCycle(cycle)) {
            return;
        }

        const code = form.code.trim();
        const name = form.name.trim();
        const duplicate = tracks.some(
            (track) =>
                track.cycle === cycle &&
                track.code.toLowerCase() === code.toLowerCase() &&
                track.id !== editingId,
        );

        if (duplicate) {
            showErrors({ code: 'Cette série existe déjà dans ce cycle.' });

            return;
        }

        const payload = { cycle, code, name };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Track>(updateTrack.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Track>(storeTrack.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setTracks((current) =>
                editingId
                    ? current.map((item) =>
                          item.id === editingId ? saved : item,
                      )
                    : [...current, saved],
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

    if (!lycee) {
        return (
            <>
                <Head title="Séries" />
                <div className="overflow-hidden rounded-[8px] border">
                    <EmptyState
                        icon={Layers}
                        title="Séries réservées au lycée"
                        description="Les séries concernent uniquement le lycée général et le lycée technique. Changez de cycle dans l’en-tête."
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Séries" />
            <ListPage
                embedded
                title="Séries"
                icon={Layers}
                description={`Séries ${cycleLabel(cycle)}.`}
                searchPlaceholder="Rechercher une série..."
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
                        : 'Aucune série dans ce cycle',
                    description: search.trim()
                        ? undefined
                        : `Aucune série en ${cycleLabel(cycle)}.`,
                    icon: Layers,
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
                            <TableHead className="w-14 text-center">
                                <DataTableColumnHeader icon={EllipsisVertical}>
                                    Actions
                                </DataTableColumnHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((track) => (
                            <TableRow key={track.id}>
                                <TableCell>
                                    <Badge variant="code">{track.code}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {track.name}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => setViewing(track),
                                            onEdit: () => openEdit(track),
                                            onDuplicate: () =>
                                                duplicateTrack(track),
                                            onDelete: () => removeTrack(track),
                                            confirm: {
                                                title: 'Supprimer la série ?',
                                                description: `La série ${track.name} sera retirée de ce cycle.`,
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
                icon={Layers}
                title={viewing?.name ?? 'Série'}
                description={viewing ? cycleLabel(viewing.cycle) : undefined}
                fields={
                    viewing
                        ? [
                              { label: 'Code', value: viewing.code },
                              { label: 'Libellé', value: viewing.name },
                              {
                                  label: 'Cycle',
                                  value: <CycleBadge cycle={viewing.cycle} />,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier la série' : 'Nouvelle série'}
                description={cycleLabel(cycle)}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void saveTrack();
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
            </FormSheet>
        </>
    );
}

StructureTracksPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Séries', href: tracksRoute() },
    ],
};
