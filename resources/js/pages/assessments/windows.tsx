import { Head } from '@inertiajs/react';
import {
    Bell,
    Calendar,
    CalendarRange,
    Lock,
    LockOpen,
    PenLine,
    Plus,
    Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { AssessmentTypeBadge } from '@/components/sms/code-badge';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useSchoolContext } from '@/hooks/use-school-context';
import { ApiError, apiData, apiJson } from '@/lib/api';
import { requiredDate, requiredText } from '@/lib/school-form';
import { ASSESSMENT_TYPES } from '@/lib/school-grades';
import {
    markingWindowStatus,
    markingWindowStatusLabel,
    windowFor,
} from '@/lib/school-marking-windows';
import { cycleLabel, formatFrDate, todayIso } from '@/lib/school-rows';
import { assessmentTypeLabel } from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import {
    close as closeWindow,
    notify as notifyWindow,
    reopen as reopenWindow,
    store as storeWindow,
    update as updateWindow,
} from '@/routes/api/v1/marking-windows';
import { devoirs, windows as windowsRoute } from '@/routes/assessments';
import type {
    AssessmentType,
    MarkingWindow,
    SchoolDataset,
} from '@/types/school';

type WindowForm = {
    termId: string;
    type: AssessmentType;
    opensOn: string;
    closesOn: string;
};

const windowSchema = z
    .object({
        termId: requiredText('Le trimestre'),
        type: requiredText('Le type'),
        opensOn: requiredDate('La date d’ouverture'),
        closesOn: requiredDate('La date de clôture'),
    })
    .refine((data) => data.closesOn >= data.opensOn, {
        message: 'La date de clôture doit être postérieure ou égale à l’ouverture.',
        path: ['closesOn'],
    });

function statusBadgeVariant(
    status: ReturnType<typeof markingWindowStatus>,
): 'success' | 'warning' | 'muted' | 'danger' {
    switch (status) {
        case 'ouverte':
            return 'success';
        case 'fermee':
            return 'warning';
        case 'hors_periode':
            return 'muted';
        case 'cloturee':
            return 'danger';
    }
}

export default function AssessmentWindows({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { filter, academicYearLabel, staffRole } = useSchoolContext();
    const isPrivileged =
        staffRole === 'admin' || staffRole === 'directeur';
    const today = todayIso();
    const terms = catalog.terms.filter(
        (term) => term.academicYearId === filter.academicYearId,
    );
    const [items, setItems] = useState<MarkingWindow[]>(
        catalog.markingWindows ?? [],
    );
    const working = useMemo(
        () => ({ ...catalog, markingWindows: items }),
        [catalog, items],
    );
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<WindowForm>(() => ({
        termId: terms[0]?.id ?? '',
        type: 'devoir',
        opensOn: '',
        closesOn: '',
    }));
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return terms
            .flatMap((term) =>
                ASSESSMENT_TYPES.map((type) => {
                    const window = windowFor(working, term.id, type);

                    return {
                        key: `${term.id}:${type}`,
                        termId: term.id,
                        termName: term.name,
                        type,
                        window,
                        status: window
                            ? markingWindowStatus(window, today)
                            : null,
                    };
                }),
            )
            .filter((row) => {
                if (needle === '') {
                    return true;
                }

                return `${row.termName} ${assessmentTypeLabel(row.type)}`
                    .toLowerCase()
                    .includes(needle);
            });
    }, [search, terms, today, working]);

    const table = useClientTable(rows);

    function openCreate(termId?: string, type?: AssessmentType): void {
        setEditingId(null);
        setForm({
            termId: termId ?? terms[0]?.id ?? '',
            type: type ?? 'devoir',
            opensOn: '',
            closesOn: '',
        });
        clearErrors();
        setOpen(true);
    }

    function openEdit(window: MarkingWindow): void {
        setEditingId(window.id);
        setForm({
            termId: window.termId,
            type: window.type,
            opensOn: window.opensOn,
            closesOn: window.closesOn,
        });
        clearErrors();
        setOpen(true);
    }

    function upsertLocal(saved: MarkingWindow): void {
        setItems((current) => {
            const others = current.filter(
                (item) =>
                    !(
                        item.termId === saved.termId &&
                        item.type === saved.type
                    ),
            );

            return [...others, saved];
        });
    }

    async function save(): Promise<void> {
        if (!validate(windowSchema, form)) {
            return;
        }

        const payload = {
            termId: form.termId,
            type: form.type,
            opensOn: form.opensOn,
            closesOn: form.closesOn,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<MarkingWindow>(updateWindow.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<MarkingWindow>(storeWindow.url(), {
                      method: 'POST',
                      body: payload,
                  });

            upsertLocal(saved);
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

    async function closeRow(window: MarkingWindow): Promise<void> {
        setBusyId(window.id);

        try {
            const saved = await apiData<MarkingWindow>(
                closeWindow.url(window.id),
                { method: 'POST' },
            );
            upsertLocal(saved);
            toastSaved('Fenêtre clôturée');
        } catch (error) {
            toastApiError(error);
        } finally {
            setBusyId(null);
        }
    }

    async function reopenRow(window: MarkingWindow): Promise<void> {
        setBusyId(window.id);

        try {
            const saved = await apiData<MarkingWindow>(
                reopenWindow.url(window.id),
                { method: 'POST' },
            );
            upsertLocal(saved);
            toastSaved('Fenêtre rouverte');
        } catch (error) {
            toastApiError(error);
        } finally {
            setBusyId(null);
        }
    }

    async function notifyRow(window: MarkingWindow): Promise<void> {
        setBusyId(window.id);

        try {
            const response = await apiJson<{
                message?: string;
                data: MarkingWindow;
            }>(notifyWindow.url(window.id), { method: 'POST' });

            if (response.data) {
                upsertLocal(response.data);
            }

            toastSaved(response.message ?? 'Notification envoyée');
        } catch (error) {
            toastApiError(error);
        } finally {
            setBusyId(null);
        }
    }

    if (!isPrivileged) {
        return (
            <>
                <Head title="Fenêtres de saisie" />
                <ListPage
                    embedded
                    title="Fenêtres de saisie"
                    icon={CalendarRange}
                    description="Réservé à l’administration."
                    searchPlaceholder="Rechercher…"
                    search=""
                    onSearchChange={() => undefined}
                    empty={{
                        title: 'Accès refusé',
                        description:
                            'Seuls l’administrateur et le directeur gèrent les fenêtres de saisie.',
                    }}
                >
                    <div />
                </ListPage>
            </>
        );
    }

    return (
        <>
            <Head title="Fenêtres de saisie" />
            <ListPage
                embedded
                title="Fenêtres de saisie"
                icon={CalendarRange}
                description={`${cycleLabel(filter.cycle)} · ${academicYearLabel}. Ouverture et clôture des sections devoir / composition / examen.`}
                searchPlaceholder="Rechercher un trimestre, un type..."
                search={search}
                onSearchChange={setSearch}
                actions={
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => openCreate()}
                    >
                        <Plus />
                        Créer
                    </Button>
                }
                empty={{
                    title: search.trim()
                        ? 'Aucun résultat'
                        : 'Aucun trimestre',
                    description: search.trim()
                        ? undefined
                        : 'Créez des trimestres pour l’année en cours afin de définir les fenêtres.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Trimestre
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Tag}>
                                    Type
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={CalendarRange}>
                                    Période
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((row) => (
                            <TableRow key={row.key}>
                                <TableCell className="font-medium">
                                    {row.termName}
                                </TableCell>
                                <TableCell>
                                    <AssessmentTypeBadge type={row.type} />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {row.window
                                        ? `${formatFrDate(row.window.opensOn)} → ${formatFrDate(row.window.closesOn)}`
                                        : 'Non définie'}
                                </TableCell>
                                <TableCell>
                                    {row.status ? (
                                        <Badge
                                            variant={statusBadgeVariant(
                                                row.status,
                                            )}
                                        >
                                            {markingWindowStatusLabel(
                                                row.status,
                                            )}
                                        </Badge>
                                    ) : (
                                        <Badge variant="muted">
                                            Absente
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {row.window ? (
                                        <RowMenu
                                            items={[
                                                {
                                                    label: 'Modifier',
                                                    icon: PenLine,
                                                    disabled:
                                                        busyId ===
                                                        row.window.id,
                                                    onSelect: () =>
                                                        openEdit(row.window!),
                                                },
                                                row.window.closedAt
                                                    ? {
                                                          label: 'Rouvrir',
                                                          icon: LockOpen,
                                                          disabled:
                                                              busyId ===
                                                              row.window.id,
                                                          confirm: {
                                                              title: 'Rouvrir cette fenêtre ?',
                                                              description: `La saisie des notes (${assessmentTypeLabel(row.type)} · ${row.termName}) sera de nouveau possible pour les enseignants.`,
                                                              confirmLabel:
                                                                  'Rouvrir',
                                                          },
                                                          onSelect: () => {
                                                              void reopenRow(
                                                                  row.window!,
                                                              );
                                                          },
                                                      }
                                                    : {
                                                          label: 'Clôturer',
                                                          icon: Lock,
                                                          disabled:
                                                              busyId ===
                                                              row.window.id,
                                                          confirm: {
                                                              title: 'Clôturer cette fenêtre ?',
                                                              description: `La saisie des notes (${assessmentTypeLabel(row.type)} · ${row.termName}) sera bloquée jusqu’à réouverture.`,
                                                              confirmLabel:
                                                                  'Clôturer',
                                                          },
                                                          onSelect: () => {
                                                              void closeRow(
                                                                  row.window!,
                                                              );
                                                          },
                                                      },
                                                {
                                                    label: 'Notifier',
                                                    icon: Bell,
                                                    disabled:
                                                        busyId ===
                                                        row.window.id,
                                                    confirm: {
                                                        title: 'Notifier les enseignants ?',
                                                        description: `Un e-mail sera envoyé à tous les enseignants concernant ${assessmentTypeLabel(row.type).toLowerCase()} · ${row.termName}.`,
                                                        confirmLabel:
                                                            'Notifier',
                                                    },
                                                    onSelect: () => {
                                                        void notifyRow(
                                                            row.window!,
                                                        );
                                                    },
                                                },
                                            ]}
                                        />
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    editingId
                        ? 'Modifier la fenêtre'
                        : 'Nouvelle fenêtre de saisie'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field
                    id="termId"
                    label="Trimestre"
                    required
                    error={errors.termId}
                >
                    <Select
                        value={form.termId || undefined}
                        onValueChange={(value) => {
                            clearErrors('termId');
                            setForm((current) => ({
                                ...current,
                                termId: value,
                            }));
                        }}
                        disabled={Boolean(editingId)}
                    >
                        <SelectTrigger id="termId" className="w-full">
                            <SelectValue placeholder="Choisir un trimestre" />
                        </SelectTrigger>
                        <SelectContent>
                            {terms.map((term) => (
                                <SelectItem key={term.id} value={term.id}>
                                    {term.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="type" label="Type" required error={errors.type}>
                    <Select
                        value={form.type}
                        onValueChange={(value) => {
                            clearErrors('type');
                            setForm((current) => ({
                                ...current,
                                type: value as AssessmentType,
                            }));
                        }}
                        disabled={Boolean(editingId)}
                    >
                        <SelectTrigger id="type" className="w-full">
                            <SelectValue placeholder="Choisir un type" />
                        </SelectTrigger>
                        <SelectContent>
                            {ASSESSMENT_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    <AssessmentTypeBadge type={type} />
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field
                    id="opensOn"
                    label="Ouverture"
                    required
                    error={errors.opensOn}
                >
                    <DatePicker
                        id="opensOn"
                        value={form.opensOn}
                        required
                        onChange={(value) => {
                            clearErrors('opensOn');
                            setForm((current) => ({
                                ...current,
                                opensOn: value,
                            }));
                        }}
                    />
                </Field>
                <Field
                    id="closesOn"
                    label="Clôture"
                    required
                    error={errors.closesOn}
                >
                    <DatePicker
                        id="closesOn"
                        value={form.closesOn}
                        required
                        onChange={(value) => {
                            clearErrors('closesOn');
                            setForm((current) => ({
                                ...current,
                                closesOn: value,
                            }));
                        }}
                    />
                </Field>
            </FormSheet>
        </>
    );
}

AssessmentWindows.layout = {
    breadcrumbs: [
        { title: 'Évaluations', href: devoirs() },
        { title: 'Fenêtres', href: windowsRoute() },
    ],
};
