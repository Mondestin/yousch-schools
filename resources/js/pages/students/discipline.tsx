import { Head } from '@inertiajs/react';
import { Plus, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { DataTableColumnHeader } from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { RowMenu } from '@/components/sms/row-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { ApiError, apiData, apiJson } from '@/lib/api';
import { crudItems } from '@/lib/school-crud';
import { requiredText } from '@/lib/school-form';
import { formatFrDate, todayIso } from '@/lib/school-rows';
import { studentFiche } from '@/lib/school-students';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import {
    destroy as destroySanction,
    store as storeSanction,
    update as updateSanction,
} from '@/routes/api/v1/sanctions';
import { discipline, index as students } from '@/routes/students';
import type { Sanction, SchoolDataset } from '@/types/school';

type SanctionForm = {
    date: string;
    type: string;
    reason: string;
};

const EMPTY_FORM: SanctionForm = {
    date: todayIso(),
    type: '',
    reason: '',
};

const sanctionSchema = z.object({
    type: requiredText('Le type'),
    reason: requiredText('Le motif'),
});

export default function StudentDisciplinePage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter } = useSchoolContext();
    const [items, setItems] = useState<Sanction[]>(() =>
        catalog.sanctions.filter((item) => item.studentId === studentId),
    );
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<Sanction | null>(null);
    const [form, setForm] = useState<SanctionForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);

    function patchForm(next: Partial<SanctionForm>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    if (!fiche) {
        return null;
    }

    function openCreate(): void {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, date: todayIso() });
        clearErrors();
        setOpen(true);
    }

    function openEdit(sanction: Sanction): void {
        setEditingId(sanction.id);
        setForm({
            date: sanction.date,
            type: sanction.type,
            reason: sanction.reason,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicate(sanction: Sanction): void {
        setEditingId(null);
        setForm({
            date: todayIso(),
            type: sanction.type,
            reason: sanction.reason,
        });
        clearErrors();
        setOpen(true);
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroySanction.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Sanction supprimée');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(sanctionSchema, form)) {
            return;
        }

        const payload = {
            studentId,
            date: form.date,
            type: form.type.trim(),
            reason: form.reason.trim(),
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Sanction>(updateSanction.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Sanction>(storeSanction.url(), {
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
            <Head title={`${fiche.name} : Discipline`} />
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold">Discipline</h2>
                <Button type="button" onClick={openCreate}>
                    <Plus />
                    Sanction
                </Button>
            </div>
            <div className="overflow-hidden rounded-[8px] border">
                {items.length === 0 ? (
                    <EmptyState
                        icon={ShieldAlert}
                        title="Aucune sanction"
                        description="Avertissements, exclusions et convocations de cet élève apparaîtront ici."
                    />
                ) : (
                    <Table containerClassName="rounded-none border-0">
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <DataTableColumnHeader>
                                        Date
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader>
                                        Type
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader>
                                        Motif
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {formatFrDate(item.date)}
                                    </TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell>{item.reason}</TableCell>
                                    <TableCell>
                                        <RowMenu
                                            items={crudItems({
                                                onView: () => setViewing(item),
                                                onEdit: () => openEdit(item),
                                                onDuplicate: () =>
                                                    duplicate(item),
                                                onDelete: () => {
                                                    void remove(item.id);
                                                },
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                title={viewing?.type ?? 'Sanction'}
                description={viewing ? formatFrDate(viewing.date) : undefined}
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Motif',
                                  value: viewing.reason,
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier la sanction' : 'Nouvelle sanction'}
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
                <Field id="type" label="Type" required error={errors.type}>
                    <Input
                        id="type"
                        value={form.type}
                        onChange={(event) =>
                            patchForm({ type: event.target.value })
                        }
                    />
                </Field>
                <Field id="reason" label="Motif" required error={errors.reason}>
                    <Textarea
                        id="reason"
                        value={form.reason}
                        rows={3}
                        onChange={(event) =>
                            patchForm({ reason: event.target.value })
                        }
                    />
                </Field>
            </FormSheet>
        </>
    );
}

StudentDisciplinePage.layout = (props: {
    studentId: string;
    catalog: SchoolDataset;
}) => ({
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        {
            title: 'Discipline',
            href: discipline(props.studentId),
        },
    ],
});
