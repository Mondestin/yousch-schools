import { Head } from '@inertiajs/react';
import {
    Boxes,
    CircleDot,
    Coins,
    EllipsisVertical,
    Hash,
    MapPin,
    Package,
    Plus,
    TriangleAlert,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { ListPage } from '@/components/sms/list-page';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
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
import { Textarea } from '@/components/ui/textarea';
import { useCrudItems } from '@/hooks/use-crud-items';
import { requiredText } from '@/lib/school-form';
import {
    INVENTORY_CONDITIONS,
    INVENTORY_STATUSES,
    inventoryConditionLabel,
    inventoryConditionVariant,
    inventoryStatusLabel,
    inventoryStatusVariant,
    inventoryValue,
    isLowStock,
    nextInventoryReference,
} from '@/lib/school-office';
import { formatFcfa, formatFrDate, todayIso } from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyInventory,
    store as storeInventory,
    update as updateInventory,
} from '@/routes/api/v1/inventory';
import { index as inventory } from '@/routes/inventory';
import type {
    InventoryCondition,
    InventoryItem,
    InventoryStatus,
    SchoolDataset,
} from '@/types/school';

type ItemForm = {
    reference: string;
    name: string;
    category: string;
    quantity: string;
    minQuantity: string;
    unitCost: string;
    condition: InventoryCondition;
    status: InventoryStatus;
    location: string;
    assignee: string;
    supplier: string;
    acquiredOn: string;
    warrantyUntil: string;
    notes: string;
};

const EMPTY_FORM: ItemForm = {
    reference: '',
    name: '',
    category: '',
    quantity: '1',
    minQuantity: '1',
    unitCost: '',
    condition: 'bon',
    status: 'en_service',
    location: '',
    assignee: '',
    supplier: '',
    acquiredOn: todayIso(),
    warrantyUntil: '',
    notes: '',
};

const inventorySchema = z.object({
    name: requiredText('Le nom'),
    category: requiredText('La catégorie'),
    quantity: z.string().refine((value) => {
        const parsed = Number(value.replace(',', '.'));

        return Number.isFinite(parsed) && parsed >= 0;
    }, 'La quantité doit être un nombre supérieur ou égal à 0.'),
});

export default function InventoryIndex({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const crudItems = useCrudItems();

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [status, setStatus] = useState<'all' | InventoryStatus>('all');
    const [condition, setCondition] = useState<'all' | InventoryCondition>(
        'all',
    );
    const [items, setItems] = useState<InventoryItem[]>(catalog.inventory);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<InventoryItem | null>(null);
    const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();

    const categories = useMemo(
        () =>
            [...new Set(items.map((item) => item.category))].sort((a, b) =>
                a.localeCompare(b, 'fr'),
            ),
        [items],
    );
    const stats = useMemo(() => {
        const active = items.filter((item) => item.status !== 'reforme');

        return {
            units: active.reduce((sum, item) => sum + item.quantity, 0),
            value: active.reduce((sum, item) => sum + inventoryValue(item), 0),
            repairs: items.filter((item) => item.status === 'en_reparation')
                .length,
            low: items.filter(isLowStock).length,
        };
    }, [items]);
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return items
            .filter((item) => category === 'all' || item.category === category)
            .filter((item) => status === 'all' || item.status === status)
            .filter(
                (item) => condition === 'all' || item.condition === condition,
            )
            .filter((item) =>
                needle === ''
                    ? true
                    : `${item.reference} ${item.name} ${item.category} ${item.location} ${item.assignee} ${item.supplier}`
                          .toLowerCase()
                          .includes(needle),
            );
    }, [category, condition, items, search, status]);
    const table = useClientTable(rows);

    function openCreate(): void {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            acquiredOn: todayIso(),
            reference: nextInventoryReference(items, ''),
        });
        clearErrors();
        setOpen(true);
    }

    function openEdit(item: InventoryItem): void {
        setEditingId(item.id);
        setForm({
            reference: item.reference,
            name: item.name,
            category: item.category,
            quantity: String(item.quantity),
            minQuantity: String(item.minQuantity),
            unitCost: String(item.unitCost),
            condition: item.condition,
            status: item.status,
            location: item.location,
            assignee: item.assignee,
            supplier: item.supplier,
            acquiredOn: item.acquiredOn,
            warrantyUntil: item.warrantyUntil ?? '',
            notes: item.notes,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicate(item: InventoryItem): void {
        setEditingId(null);
        setForm({
            reference: nextInventoryReference(items, item.category),
            name: `${item.name} (copie)`,
            category: item.category,
            quantity: String(item.quantity),
            minQuantity: String(item.minQuantity),
            unitCost: String(item.unitCost),
            condition: item.condition,
            status: item.status,
            location: item.location,
            assignee: item.assignee,
            supplier: item.supplier,
            acquiredOn: todayIso(),
            warrantyUntil: item.warrantyUntil ?? '',
            notes: item.notes,
        });
        clearErrors();
        setOpen(true);
    }

    async function remove(item: InventoryItem): Promise<void> {
        try {
            await apiJson(destroyInventory.url(item.id), { method: 'DELETE' });
            setItems((current) => current.filter((row) => row.id !== item.id));
            toastRemoved('Article retiré de l’inventaire');
        } catch (error) {
            toastApiError(error, 'Impossible de supprimer l’article');
        }
    }

    async function setStatusOf(
        item: InventoryItem,
        next: InventoryStatus,
    ): Promise<void> {
        try {
            const saved = await apiData<InventoryItem>(
                updateInventory.url(item.id),
                {
                    method: 'PUT',
                    body: { ...item, status: next },
                },
            );
            setItems((current) =>
                current.map((row) => (row.id === item.id ? saved : row)),
            );
            toastSaved(`${item.name} - ${inventoryStatusLabel(next)}`);
        } catch (error) {
            toastApiError(error);
        }
    }

    function patchForm(next: Partial<ItemForm>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    async function save(): Promise<void> {
        if (!validate(inventorySchema, form)) {
            return;
        }

        const quantity = Number(form.quantity);
        const minQuantity = Number(form.minQuantity);
        const unitCost = Number(form.unitCost.replace(',', '.'));

        const payload = {
            reference:
                form.reference.trim() ||
                nextInventoryReference(items, form.category),
            name: form.name.trim(),
            category: form.category.trim(),
            quantity,
            minQuantity: Number.isFinite(minQuantity) ? minQuantity : 0,
            unitCost: Number.isFinite(unitCost) ? unitCost : 0,
            condition: form.condition,
            status: form.status,
            location: form.location.trim(),
            assignee: form.assignee.trim() || null,
            supplier: form.supplier.trim() || null,
            acquiredOn: form.acquiredOn || null,
            warrantyUntil: form.warrantyUntil || null,
            notes: form.notes.trim() || null,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<InventoryItem>(updateInventory.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<InventoryItem>(storeInventory.url(), {
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
            <Head title="Matériel" />
            <PageShell flush className="overflow-hidden">
                <PageHeader
                    flush
                    title="Gestion du matériel"
                    description="Registre des biens de l’établissement : références, valeur, état, affectation et seuils de réapprovisionnement."
                />

                <ListPage
                    embedded
                    title="Matériel"
                    icon={Package}
                    description="Registre des biens de l’établissement."
                    searchPlaceholder="Rechercher une référence, un article, un lieu..."
                    search={search}
                    onSearchChange={setSearch}
                    stats={
                        <KpiGrid>
                            <KpiCard
                                icon={Boxes}
                                label="Unités en parc"
                                value={new Intl.NumberFormat('fr-FR').format(
                                    stats.units,
                                )}
                                hint={`${items.length} référence${items.length > 1 ? 's' : ''} au registre`}
                            />
                            <KpiCard
                                icon={Coins}
                                label="Valeur du parc"
                                value={formatFcfa(stats.value)}
                                hint="Quantité × coût unitaire, hors réformés"
                            />
                            <KpiCard
                                icon={Wrench}
                                label="En réparation"
                                value={String(stats.repairs)}
                                hint="Biens immobilisés en atelier"
                            />
                            <KpiCard
                                icon={TriangleAlert}
                                label="Sous le seuil"
                                value={String(stats.low)}
                                hint="Réapprovisionnement à déclencher"
                            />
                        </KpiGrid>
                    }
                    filters={
                        <>
                            <Select
                                value={category}
                                onValueChange={setCategory}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label="Filtrer par catégorie"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Toutes les catégories
                                    </SelectItem>
                                    {categories.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={status}
                                onValueChange={(value) =>
                                    setStatus(value as 'all' | InventoryStatus)
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label="Filtrer par statut"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Tous les statuts
                                    </SelectItem>
                                    {INVENTORY_STATUSES.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {inventoryStatusLabel(value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={condition}
                                onValueChange={(value) =>
                                    setCondition(
                                        value as 'all' | InventoryCondition,
                                    )
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label="Filtrer par état"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Tous les états
                                    </SelectItem>
                                    {INVENTORY_CONDITIONS.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {inventoryConditionLabel(value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    }
                    actions={
                        <Button type="button" size="sm" onClick={openCreate}>
                            <Plus />
                            Ajouter
                        </Button>
                    }
                    empty={{
                        title:
                            search.trim() ||
                            category !== 'all' ||
                            status !== 'all' ||
                            condition !== 'all'
                                ? 'Aucun résultat'
                                : 'Aucun article',
                        description: 'Ajoutez le premier élément d’inventaire.',
                    }}
                    paging={table}
                >
                    <Table containerClassName={DATA_TABLE_CONTAINER}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <DataTableColumnHeader icon={Package}>
                                        Article
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Hash}>
                                        Quantité
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={CircleDot}>
                                        État
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Wrench}>
                                        Statut
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={MapPin}>
                                        Lieu
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Coins}>
                                        Valeur
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead className="w-14 text-center">
                                    <DataTableColumnHeader
                                        icon={EllipsisVertical}
                                    >
                                        Actions
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.pageRows.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <p className="font-medium">
                                            {item.name}
                                        </p>
                                        <p className="text-muted-foreground text-[12px]">
                                            {item.reference} · {item.category}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1.5">
                                            {item.quantity}
                                            {isLowStock(item) && (
                                                <TriangleAlert
                                                    className="text-warning size-3.5"
                                                    aria-label={`Sous le seuil de ${item.minQuantity}`}
                                                />
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={inventoryConditionVariant(
                                                item.condition,
                                            )}
                                        >
                                            {inventoryConditionLabel(
                                                item.condition,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={inventoryStatusVariant(
                                                item.status,
                                            )}
                                        >
                                            {inventoryStatusLabel(item.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {item.location || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {formatFcfa(inventoryValue(item))}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onView: () => setViewing(item),
                                                onEdit: () => openEdit(item),
                                                onDuplicate: () =>
                                                    duplicate(item),
                                                onDelete: () => remove(item),
                                                confirm: {
                                                    title: 'Retirer du registre ?',
                                                    description: `${item.name} (${item.reference}) sera supprimé de l’inventaire.`,
                                                },
                                                extras:
                                                    item.status ===
                                                    'en_reparation'
                                                        ? [
                                                              {
                                                                  label: 'Remettre en service',
                                                                  icon: Wrench,
                                                                  onSelect:
                                                                      () =>
                                                                          setStatusOf(
                                                                              item,
                                                                              'en_service',
                                                                          ),
                                                              },
                                                          ]
                                                        : [
                                                              {
                                                                  label: 'Envoyer en réparation',
                                                                  icon: Wrench,
                                                                  onSelect:
                                                                      () =>
                                                                          setStatusOf(
                                                                              item,
                                                                              'en_reparation',
                                                                          ),
                                                              },
                                                          ],
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ListPage>
            </PageShell>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                icon={Package}
                title={viewing?.name ?? 'Article'}
                description={
                    viewing
                        ? `${viewing.reference} · ${viewing.category}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Quantité',
                                  value: `${viewing.quantity} (seuil ${viewing.minQuantity})`,
                              },
                              {
                                  label: 'Valeur',
                                  value: `${formatFcfa(inventoryValue(viewing))} · ${formatFcfa(viewing.unitCost)} l’unité`,
                              },
                              {
                                  label: 'État',
                                  value: inventoryConditionLabel(
                                      viewing.condition,
                                  ),
                              },
                              {
                                  label: 'Statut',
                                  value: inventoryStatusLabel(viewing.status),
                              },
                              {
                                  label: 'Lieu',
                                  value: viewing.location || '-',
                              },
                              {
                                  label: 'Responsable',
                                  value: viewing.assignee || '-',
                              },
                              {
                                  label: 'Fournisseur',
                                  value: viewing.supplier || '-',
                              },
                              {
                                  label: 'Acquis le',
                                  value: formatFrDate(viewing.acquiredOn),
                              },
                              {
                                  label: 'Garantie',
                                  value: viewing.warrantyUntil
                                      ? `Jusqu’au ${formatFrDate(viewing.warrantyUntil)}`
                                      : 'Hors garantie',
                              },
                              {
                                  label: 'Notes',
                                  value: viewing.notes || 'Aucune note.',
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier l’article' : 'Ajouter un article'}
                description="Les champs de suivi alimentent la valeur du parc et les alertes de réapprovisionnement."
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field
                    id="reference"
                    label="Référence"
                    hint="Générée automatiquement, modifiable."
                >
                    <Input
                        id="reference"
                        value={form.reference}
                        onChange={(event) =>
                            patchForm({ reference: event.target.value })
                        }
                    />
                </Field>
                <Field id="name" label="Article" required error={errors.name}>
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
                    id="category"
                    label="Catégorie"
                    required
                    error={errors.category}
                >
                    <Input
                        id="category"
                        list="inventory-categories"
                        value={form.category}
                        required
                        onChange={(event) =>
                            patchForm({ category: event.target.value })
                        }
                    />
                    <datalist id="inventory-categories">
                        {categories.map((value) => (
                            <option key={value} value={value} />
                        ))}
                    </datalist>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        id="quantity"
                        label="Quantité"
                        required
                        error={errors.quantity}
                    >
                        <Input
                            id="quantity"
                            inputMode="numeric"
                            value={form.quantity}
                            required
                            onChange={(event) =>
                                patchForm({ quantity: event.target.value })
                            }
                        />
                    </Field>
                    <Field
                        id="minQuantity"
                        label="Seuil d’alerte"
                        hint="Alerte sous ce niveau."
                    >
                        <Input
                            id="minQuantity"
                            inputMode="numeric"
                            value={form.minQuantity}
                            onChange={(event) =>
                                patchForm({ minQuantity: event.target.value })
                            }
                        />
                    </Field>
                </div>
                <Field id="unitCost" label="Coût unitaire (FCFA)">
                    <Input
                        id="unitCost"
                        inputMode="decimal"
                        value={form.unitCost}
                        onChange={(event) =>
                            patchForm({ unitCost: event.target.value })
                        }
                    />
                </Field>
                <Field id="condition" label="État" required>
                    <Select
                        value={form.condition}
                        onValueChange={(value) =>
                            patchForm({
                                condition: value as InventoryCondition,
                            })
                        }
                    >
                        <SelectTrigger id="condition" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INVENTORY_CONDITIONS.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {inventoryConditionLabel(value)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="status" label="Statut" required>
                    <Select
                        value={form.status}
                        onValueChange={(value) =>
                            patchForm({ status: value as InventoryStatus })
                        }
                    >
                        <SelectTrigger id="status" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INVENTORY_STATUSES.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {inventoryStatusLabel(value)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="location" label="Lieu">
                    <Input
                        id="location"
                        list="inventory-locations"
                        value={form.location}
                        onChange={(event) =>
                            patchForm({ location: event.target.value })
                        }
                    />
                    <datalist id="inventory-locations">
                        {catalog.venues.map((venue) => (
                            <option key={venue.id} value={venue.name} />
                        ))}
                    </datalist>
                </Field>
                <Field id="assignee" label="Responsable">
                    <Input
                        id="assignee"
                        value={form.assignee}
                        onChange={(event) =>
                            patchForm({ assignee: event.target.value })
                        }
                    />
                </Field>
                <Field id="supplier" label="Fournisseur">
                    <Input
                        id="supplier"
                        value={form.supplier}
                        onChange={(event) =>
                            patchForm({ supplier: event.target.value })
                        }
                    />
                </Field>
                <Field id="acquiredOn" label="Date d’acquisition">
                    <DatePicker
                        id="acquiredOn"
                        value={form.acquiredOn}
                        onChange={(value) => patchForm({ acquiredOn: value })}
                    />
                </Field>
                <Field id="warrantyUntil" label="Garantie jusqu’au">
                    <DatePicker
                        id="warrantyUntil"
                        value={form.warrantyUntil}
                        onChange={(value) =>
                            patchForm({ warrantyUntil: value })
                        }
                    />
                </Field>
                <Field id="notes" label="Notes">
                    <Textarea
                        id="notes"
                        rows={3}
                        value={form.notes}
                        onChange={(event) =>
                            patchForm({ notes: event.target.value })
                        }
                    />
                </Field>
            </FormSheet>
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [{ title: 'Matériel', href: inventory() }],
};
