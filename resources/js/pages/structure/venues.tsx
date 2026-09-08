import { Head } from '@inertiajs/react';
import {
    Building,
    CircleDot,
    DoorOpen,
    EllipsisVertical,
    Plus,
    Shapes,
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
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useCrudItems } from '@/hooks/use-crud-items';
import { requiredText } from '@/lib/school-form';
import { VENUE_KINDS, venueKindLabel } from '@/lib/school-structure';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyVenue,
    store as storeVenue,
    update as updateVenue,
} from '@/routes/api/v1/school/venues';
import { index as yearsRoute, venues as venuesRoute } from '@/routes/structure';
import type { SchoolDataset, Venue, VenueKind } from '@/types/school';

type VenueForm = {
    name: string;
    kind: VenueKind;
    building: string;
    capacity: number;
    available: boolean;
};

const EMPTY_FORM: VenueForm = {
    name: '',
    kind: 'salle',
    building: '',
    capacity: 40,
    available: true,
};

const venueSchema = z.object({
    name: requiredText('Le nom'),
});

export default function StructureVenuesPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const crudItems = useCrudItems();

    const [search, setSearch] = useState('');
    const [venues, setVenues] = useState<Venue[]>(catalog.venues);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState<Venue | null>(null);
    const [form, setForm] = useState<VenueForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (query === '') {
            return venues;
        }

        return venues.filter((venue) =>
            `${venue.name} ${venue.building ?? ''} ${venueKindLabel(venue.kind)}`
                .toLowerCase()
                .includes(query),
        );
    }, [search, venues]);
    const table = useClientTable(rows);

    function patchForm(patch: Partial<VenueForm>): void {
        clearErrors(Object.keys(patch));
        setForm((current) => ({ ...current, ...patch }));
    }

    function openCreate(): void {
        setEditingId(null);
        setForm(EMPTY_FORM);
        clearErrors();
        setOpen(true);
    }

    function openEdit(venue: Venue): void {
        setEditingId(venue.id);
        setForm({
            name: venue.name,
            kind: venue.kind,
            building: venue.building ?? '',
            capacity: venue.capacity,
            available: venue.available,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicateVenue(venue: Venue): void {
        setEditingId(null);
        setForm({
            name: `${venue.name} (copie)`,
            kind: venue.kind,
            building: venue.building ?? '',
            capacity: venue.capacity,
            available: venue.available,
        });
        clearErrors();
        setOpen(true);
    }

    async function removeVenue(venue: Venue): Promise<void> {
        try {
            await apiJson(destroyVenue.url(venue.id), { method: 'DELETE' });
            setVenues((current) =>
                current.filter((item) => item.id !== venue.id),
            );
            toastRemoved(`${venue.name} supprimée`);
        } catch (error) {
            toastApiError(error);
        }
    }

    async function saveVenue(): Promise<void> {
        if (!validate(venueSchema, form)) {
            return;
        }

        const name = form.name.trim();
        const duplicate = venues.some(
            (venue) =>
                venue.name.toLowerCase() === name.toLowerCase() &&
                venue.id !== editingId,
        );

        if (duplicate) {
            showErrors({ name: 'Une salle porte déjà ce nom.' });

            return;
        }

        const payload = {
            name,
            kind: form.kind,
            building: form.building.trim() || null,
            capacity: Number(form.capacity) || 0,
            available: form.available,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Venue>(updateVenue.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Venue>(storeVenue.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setVenues((current) =>
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

    return (
        <>
            <Head title="Salles de classe" />
            <ListPage
                embedded
                title="Salles de classe"
                icon={DoorOpen}
                description="Salles, laboratoires et ateliers utilisés dans l’emploi du temps."
                searchPlaceholder="Rechercher une salle..."
                search={search}
                onSearchChange={setSearch}
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Ajouter
                    </Button>
                }
                empty={{
                    title: search.trim() ? 'Aucun résultat' : 'Aucune salle',
                    description: search.trim()
                        ? undefined
                        : 'Ajoutez les salles de l’établissement pour les affecter dans l’emploi du temps.',
                    icon: DoorOpen,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={DoorOpen}>
                                    Salle
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Shapes}>
                                    Type
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Building}>
                                    Bâtiment
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Users}>
                                    Capacité
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={CircleDot}>
                                    Statut
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
                        {table.pageRows.map((venue) => (
                            <TableRow key={venue.id}>
                                <TableCell className="font-medium">
                                    {venue.name}
                                </TableCell>
                                <TableCell>
                                    {venueKindLabel(venue.kind)}
                                </TableCell>
                                <TableCell>{venue.building ?? '-'}</TableCell>
                                <TableCell>{venue.capacity} places</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            venue.available
                                                ? 'success'
                                                : 'warning'
                                        }
                                    >
                                        {venue.available
                                            ? 'Disponible'
                                            : 'Indisponible'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => setViewing(venue),
                                            onEdit: () => openEdit(venue),
                                            onDuplicate: () =>
                                                duplicateVenue(venue),
                                            onDelete: () => removeVenue(venue),
                                            confirm: {
                                                title: 'Supprimer la salle ?',
                                                description: `${venue.name} sera retirée des salles disponibles pour l’emploi du temps.`,
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
                icon={DoorOpen}
                title={viewing?.name ?? 'Salle'}
                description={viewing ? venueKindLabel(viewing.kind) : undefined}
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Type',
                                  value: venueKindLabel(viewing.kind),
                              },
                              {
                                  label: 'Bâtiment',
                                  value: viewing.building ?? '-',
                              },
                              {
                                  label: 'Capacité',
                                  value: `${viewing.capacity} places`,
                              },
                              {
                                  label: 'Statut',
                                  value: viewing.available
                                      ? 'Disponible'
                                      : 'Indisponible',
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier la salle' : 'Nouvelle salle'}
                description="Lieu physique où se déroulent les cours."
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void saveVenue();
                }}
            >
                <Field id="name" label="Nom" required error={errors.name}>
                    <Input
                        id="name"
                        value={form.name}
                        required
                        placeholder="Salle 3"
                        onChange={(event) =>
                            patchForm({ name: event.target.value })
                        }
                    />
                </Field>
                <Field id="kind" label="Type" required>
                    <Select
                        value={form.kind}
                        onValueChange={(value) =>
                            patchForm({ kind: value as VenueKind })
                        }
                    >
                        <SelectTrigger id="kind" className="w-full">
                            <SelectValue placeholder="Choisir un type" />
                        </SelectTrigger>
                        <SelectContent>
                            {VENUE_KINDS.map((kind) => (
                                <SelectItem key={kind} value={kind}>
                                    {venueKindLabel(kind)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="building" label="Bâtiment">
                    <Input
                        id="building"
                        value={form.building}
                        placeholder="Bâtiment A"
                        onChange={(event) =>
                            patchForm({ building: event.target.value })
                        }
                    />
                </Field>
                <Field id="capacity" label="Capacité" required>
                    <Input
                        id="capacity"
                        type="number"
                        min={1}
                        value={form.capacity}
                        required
                        onChange={(event) =>
                            patchForm({ capacity: Number(event.target.value) })
                        }
                    />
                </Field>
                <Field id="available" label="Statut" required>
                    <Select
                        value={form.available ? 'oui' : 'non'}
                        onValueChange={(value) =>
                            patchForm({ available: value === 'oui' })
                        }
                    >
                        <SelectTrigger id="available" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="oui">Disponible</SelectItem>
                            <SelectItem value="non">Indisponible</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
            </FormSheet>
        </>
    );
}

StructureVenuesPage.layout = {
    breadcrumbs: [
        { title: 'Structure', href: yearsRoute() },
        { title: 'Salles de classe', href: venuesRoute() },
    ],
};
