import { Head } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Banknote,
    Calendar,
    EllipsisVertical,
    FileText,
    Plus,
    Scale,
    Tag,
    Wallet,
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
import { Textarea } from '@/components/ui/textarea';
import {
    cashBalance,
    cashKindLabel,
    cashMethodLabel,
} from '@/lib/school-office';
import { useCrudItems } from '@/hooks/use-crud-items';
import { requiredAmount, requiredText } from '@/lib/school-form';
import {
    formatFcfa,
    formatFrDate,
    formatFrMonth,
    todayIso,
} from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyCashMovement,
    store as storeCashMovement,
    update as updateCashMovement,
} from '@/routes/api/v1/cash-movements';
import { index as cash } from '@/routes/cash';
import type { CashKind, CashMovement, SchoolDataset } from '@/types/school';

type MovementForm = {
    date: string;
    kind: CashKind;
    label: string;
    description: string;
    amount: string;
    method: CashMovement['method'];
};

const EMPTY_FORM: MovementForm = {
    date: todayIso(),
    kind: 'entree',
    label: '',
    description: '',
    amount: '',
    method: 'especes',
};

const cashSchema = z.object({
    label: requiredText('Le libellé'),
    amount: requiredAmount('Le montant'),
});

export default function CashIndex({ catalog }: { catalog: SchoolDataset }) {
    const crudItems = useCrudItems();

    const [search, setSearch] = useState('');
    const [month, setMonth] = useState('all');
    const [kind, setKind] = useState<'all' | CashKind>('all');
    const [items, setItems] = useState<CashMovement[]>(catalog.cashMovements);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<CashMovement | null>(null);
    const [form, setForm] = useState<MovementForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const working = useMemo(
        () => ({ ...catalog, cashMovements: items }),
        [catalog, items],
    );
    const months = useMemo(
        () =>
            [...new Set(items.map((item) => item.date.slice(0, 7)))].sort(
                (left, right) => right.localeCompare(left),
            ),
        [items],
    );
    const scoped = useMemo(
        () =>
            [...items]
                .sort((left, right) => right.date.localeCompare(left.date))
                .filter(
                    (item) => month === 'all' || item.date.startsWith(month),
                ),
        [items, month],
    );
    const stats = useMemo(() => {
        const entries = scoped.filter((item) => item.kind === 'entree');
        const exits = scoped.filter((item) => item.kind === 'sortie');
        const inAmount = entries.reduce((sum, item) => sum + item.amount, 0);
        const outAmount = exits.reduce((sum, item) => sum + item.amount, 0);

        return {
            inAmount,
            outAmount,
            net: inAmount - outAmount,
            entries: entries.length,
            exits: exits.length,
        };
    }, [scoped]);
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return scoped.filter((item) => {
            if (kind !== 'all' && item.kind !== kind) {
                return false;
            }

            return needle === ''
                ? true
                : `${item.label} ${item.description}`
                      .toLowerCase()
                      .includes(needle);
        });
    }, [kind, scoped, search]);
    const table = useClientTable(rows);

    function openCreate(): void {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, date: todayIso() });
        clearErrors();
        setOpen(true);
    }

    function openEdit(movement: CashMovement): void {
        setEditingId(movement.id);
        setForm({
            date: movement.date,
            kind: movement.kind,
            label: movement.label,
            description: movement.description,
            amount: String(movement.amount),
            method: movement.method,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicate(movement: CashMovement): void {
        setEditingId(null);
        setForm({
            date: todayIso(),
            kind: movement.kind,
            label: `${movement.label} (copie)`,
            description: movement.description,
            amount: String(movement.amount),
            method: movement.method,
        });
        clearErrors();
        setOpen(true);
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyCashMovement.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Mouvement supprimé');
        } catch (error) {
            toastApiError(error);
        }
    }

    function patchForm(next: Partial<MovementForm>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    async function save(): Promise<void> {
        if (!validate(cashSchema, form)) {
            return;
        }

        const amount = Math.round(Number(form.amount.replace(',', '.')));
        const payload = {
            date: form.date,
            kind: form.kind,
            label: form.label.trim(),
            description: form.description.trim() || null,
            amount,
            method: form.method,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<CashMovement>(
                      updateCashMovement.url(editingId),
                      {
                          method: 'PUT',
                          body: payload,
                      },
                  )
                : await apiData<CashMovement>(storeCashMovement.url(), {
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
            <Head title="Caisse : Mouvements" />
            <KpiGrid className="mx-6 my-4">
                <KpiCard
                    icon={Scale}
                    label="Solde du journal"
                    value={formatFcfa(cashBalance(working))}
                    hint="Toutes périodes · entrées − sorties"
                />
                <KpiCard
                    icon={ArrowDownLeft}
                    label="Entrées"
                    value={formatFcfa(stats.inAmount)}
                    hint={`${stats.entries} mouvement${stats.entries > 1 ? 's' : ''} sur la période`}
                />
                <KpiCard
                    icon={ArrowUpRight}
                    label="Sorties"
                    value={formatFcfa(stats.outAmount)}
                    hint={`${stats.exits} mouvement${stats.exits > 1 ? 's' : ''} sur la période`}
                />
                <KpiCard
                    icon={Wallet}
                    label="Solde de la période"
                    value={`${stats.net < 0 ? '− ' : ''}${formatFcfa(Math.abs(stats.net))}`}
                    hint={
                        month === 'all'
                            ? 'Toutes les dates'
                            : formatFrMonth(month)
                    }
                />
            </KpiGrid>
            <ListPage
                embedded
                title="Mouvements"
                description={`Journal de caisse : espèces, mobile money, virement.`}
                icon={Banknote}
                searchPlaceholder="Rechercher un libellé, une description..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <>
                        <SearchSelect
                            value={month}
                            onValueChange={setMonth}
                            className="w-[13rem]"
                            aria-label="Filtrer par mois"
                            placeholder="Tous les mois"
                            searchPlaceholder="Rechercher un mois..."
                            options={[
                                { value: 'all', label: 'Tous les mois' },
                                ...months.map((value) => ({
                                    value,
                                    label: formatFrMonth(value),
                                })),
                            ]}
                        />
                        <Select
                            value={kind}
                            onValueChange={(value) =>
                                setKind(value as 'all' | CashKind)
                            }
                        >
                            <SelectTrigger
                                className="w-[11rem]"
                                aria-label="Filtrer par type"
                            >
                                <SelectValue placeholder="Tous les types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Tous les types
                                </SelectItem>
                                <SelectItem value="entree">Entrées</SelectItem>
                                <SelectItem value="sortie">Sorties</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Mouvement
                    </Button>
                }
                empty={{
                    title: 'Aucun mouvement',
                    description: 'Enregistrez une entrée ou une sortie.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Date
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Tag}>
                                    Type
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Wallet}>
                                    Libellé
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead className="min-w-[18rem]">
                                <DataTableColumnHeader icon={FileText}>
                                    Description
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Banknote}>
                                    Mode
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Banknote}>
                                    Montant
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
                        {table.pageRows.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{formatFrDate(item.date)}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            item.kind === 'entree'
                                                ? 'success'
                                                : 'danger'
                                        }
                                    >
                                        {cashKindLabel(item.kind)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {item.label}
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-[22rem]">
                                    <span className="line-clamp-2">
                                        {item.description || '-'}
                                    </span>
                                </TableCell>
                                <TableCell className="capitalize">
                                    {cashMethodLabel(item.method)}
                                </TableCell>
                                <TableCell>
                                    {item.kind === 'sortie' ? '− ' : ''}
                                    {formatFcfa(item.amount)}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => setViewing(item),
                                            onEdit: () => openEdit(item),
                                            onDuplicate: () => duplicate(item),
                                            onDelete: () => remove(item.id),
                                            confirm: {
                                                title: 'Supprimer le mouvement ?',
                                                description: `« ${item.label} » sera retiré du journal de caisse et le solde recalculé.`,
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
                icon={Banknote}
                title={viewing?.label ?? 'Mouvement'}
                description={
                    viewing
                        ? `${cashKindLabel(viewing.kind)} du ${formatFrDate(viewing.date)}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Montant',
                                  value: `${viewing.kind === 'sortie' ? '− ' : ''}${formatFcfa(viewing.amount)}`,
                              },
                              {
                                  label: 'Mode de règlement',
                                  value: cashMethodLabel(viewing.method),
                              },
                              {
                                  label: 'Description',
                                  value:
                                      viewing.description ||
                                      'Aucune description.',
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    editingId ? 'Modifier le mouvement' : 'Nouveau mouvement'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field id="date" label="Date" required>
                    <DatePicker
                        id="date"
                        value={form.date}
                        required
                        onChange={(value) => patchForm({ date: value })}
                    />
                </Field>
                <Field id="kind" label="Type" required>
                    <Select
                        value={form.kind}
                        onValueChange={(value) =>
                            patchForm({ kind: value as CashKind })
                        }
                    >
                        <SelectTrigger id="kind" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="entree">Entrée</SelectItem>
                            <SelectItem value="sortie">Sortie</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="label" label="Libellé" required error={errors.label}>
                    <Input
                        id="label"
                        value={form.label}
                        onChange={(event) =>
                            patchForm({ label: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="description"
                    label="Description"
                    hint="Motif détaillé, références de reçus, bénéficiaire."
                >
                    <Textarea
                        id="description"
                        rows={4}
                        value={form.description}
                        onChange={(event) =>
                            patchForm({ description: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="amount"
                    label="Montant (FCFA)"
                    required
                    error={errors.amount}
                >
                    <Input
                        id="amount"
                        inputMode="decimal"
                        value={form.amount}
                        onChange={(event) =>
                            patchForm({ amount: event.target.value })
                        }
                    />
                </Field>
                <Field id="method" label="Mode" required>
                    <Select
                        value={form.method}
                        onValueChange={(value) =>
                            patchForm({
                                method: value as CashMovement['method'],
                            })
                        }
                    >
                        <SelectTrigger id="method" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="especes">Espèces</SelectItem>
                            <SelectItem value="mobile_money">
                                Mobile money
                            </SelectItem>
                            <SelectItem value="virement">Virement</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
            </FormSheet>
        </>
    );
}

CashIndex.layout = {
    breadcrumbs: [{ title: 'Caisse', href: cash() }],
};
