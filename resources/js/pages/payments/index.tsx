import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Banknote,
    Calendar,
    CircleDot,
    CircleDollarSign,
    EllipsisVertical,
    Percent,
    Plus,
    Printer,
    School,
    User,
    Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { ListPage } from '@/components/sms/list-page';
import { PersonCell } from '@/components/sms/person-cell';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchSelect } from '@/components/sms/search-select';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCrudItems } from '@/hooks/use-crud-items';
import { parseFields, requiredAmount, requiredText } from '@/lib/school-form';
import { cashMethodLabel } from '@/lib/school-office';
import {
    academicYearMonths,
    applyCashToYear,
    expectedFee,
    feeLedgerRows,
    feeStats,
    isFeeOverdue,
    monthDueOn,
    paymentAccount,
    type FeeLedgerRow,
} from '@/lib/school-payments';
import {
    academicMonth,
    cycleLabel,
    formatFcfa,
    formatFrDate,
    formatFrMonth,
    paymentRows,
    paymentStatusLabel,
    studentRows,
    todayIso,
} from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyPayment,
    store as storePayment,
    update as updatePayment,
} from '@/routes/api/v1/payments';
import { receipt, index as payments, show } from '@/routes/payments';
import type {
    Payment,
    PaymentMethod,
    PaymentStatus,
    SchoolDataset,
} from '@/types/school';

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
    paye: 'success',
    partiel: 'warning',
    impaye: 'danger',
};

const METHODS: PaymentMethod[] = ['especes', 'mobile_money', 'virement'];

const paymentSchema = z.object({
    studentId: requiredText('L’élève'),
    month: requiredText('Le mois'),
    amount: requiredAmount('Le montant'),
});

export default function PaymentsIndex({ catalog }: { catalog: SchoolDataset }) {
    const crudItems = useCrudItems();

    const { filter, query, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [classroomId, setClassroomId] = useState('all');
    const [status, setStatus] = useState<'all' | PaymentStatus>('all');
    const year = catalog.academicYears.find(
        (item) => item.id === filter.academicYearId,
    );
    const months = year ? academicYearMonths(year) : [];
    const [month, setMonth] = useState(() =>
        year ? academicMonth(year) : 'all',
    );
    const [items, setItems] = useState<Payment[]>(catalog.payments);
    const [open, setOpen] = useState(false);
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const students = studentRows(catalog, filter).filter(
        (row) => row.status === 'inscrit',
    );
    const [form, setForm] = useState({
        studentId: students[0]?.studentId ?? '',
        month: year ? academicMonth(year) : (months[0] ?? ''),
        amount: '',
        markPaid: false,
        method: 'especes' as PaymentMethod,
    });
    const { errors, clearErrors, showErrors, validate } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const selectedStudent = students.find(
        (row) => row.studentId === form.studentId,
    );
    const expected = selectedStudent
        ? expectedFee(catalog, selectedStudent.cycle)
        : 0;
    const account =
        selectedStudent && form.month !== ''
            ? paymentAccount(items, selectedStudent.id, form.month, expected)
            : null;
    const working = useMemo(
        () => ({ ...catalog, payments: items }),
        [catalog, items],
    );

    useEffect(() => {
        setClassroomId('all');
        setStatus('all');
        const current = catalog.academicYears.find(
            (item) => item.id === filter.academicYearId,
        );

        setMonth(current ? academicMonth(current) : 'all');
    }, [catalog.academicYears, filter.academicYearId, filter.cycle]);

    const ledger = useMemo((): FeeLedgerRow[] => {
        if (month === 'all') {
            return paymentRows(working, filter).map((row) => ({
                ...row,
                dueOn: monthDueOn(row.month),
                overdue: isFeeOverdue(row.month, row.status),
                draft: false,
            }));
        }

        return feeLedgerRows(working, filter, month);
    }, [filter, month, working]);

    const scoped = useMemo(
        () =>
            ledger.filter(
                (row) =>
                    classroomId === 'all' || row.classroomId === classroomId,
            ),
        [classroomId, ledger],
    );
    const stats = useMemo(() => feeStats(scoped), [scoped]);
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return scoped.filter((row) => {
            if (status !== 'all' && row.status !== status) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return `${row.studentName} ${row.matricule} ${row.classroom}`
                .toLowerCase()
                .includes(needle);
        });
    }, [scoped, search, status]);
    const table = useClientTable(rows);

    function accountFor(studentId: string, monthValue: string) {
        const row = students.find((item) => item.studentId === studentId);

        if (!row || monthValue === '') {
            return null;
        }

        return paymentAccount(
            items,
            row.id,
            monthValue,
            expectedFee(catalog, row.cycle),
        );
    }

    function openCreate(): void {
        const first = students[0];
        const monthValue =
            month === 'all' ? (year ? academicMonth(year) : '') : month;
        const nextAccount = first
            ? accountFor(first.studentId, monthValue)
            : null;
        setForm({
            studentId: first?.studentId ?? '',
            month: monthValue,
            amount: nextAccount ? String(nextAccount.remainingMonth) : '',
            markPaid: (nextAccount?.remainingMonth ?? 0) > 0,
            method: 'especes',
        });
        clearErrors();
        setOpen(true);
    }

    function openCollect(row: FeeLedgerRow): void {
        const nextAccount = paymentAccount(
            items,
            row.enrollmentId,
            row.month,
            row.expectedAmount,
        );
        setForm({
            studentId: row.studentId,
            month: row.month,
            amount:
                nextAccount.remainingMonth > 0
                    ? String(nextAccount.remainingMonth)
                    : '',
            markPaid: nextAccount.remainingMonth > 0 && row.status === 'impaye',
            method: row.method ?? 'especes',
        });
        clearErrors();
        setOpen(true);
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyPayment.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Versement supprimé');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        const enrollment = catalog.enrollments.find(
            (item) =>
                item.studentId === form.studentId &&
                item.academicYearId === filter.academicYearId,
        );
        const expectedAmount = expectedFee(
            catalog,
            selectedStudent?.cycle ?? filter.cycle,
        );
        const nextAccount = enrollment
            ? paymentAccount(items, enrollment.id, form.month, expectedAmount)
            : null;

        if (
            form.markPaid &&
            nextAccount !== null &&
            nextAccount.remainingMonth <= 0
        ) {
            const identity = parseFields(
                paymentSchema.omit({ amount: true }),
                form,
            );

            showErrors({
                ...(identity.ok ? {} : identity.errors),
                amount: 'Ce mois est déjà soldé. Saisissez un montant pour avancer sur les mois suivants.',
            });

            return;
        }

        if (!validate(paymentSchema, form)) {
            return;
        }

        if (!enrollment) {
            showErrors({
                studentId: 'Choisissez un élève inscrit pour cette année.',
            });

            return;
        }

        const amount = Number(form.amount.replace(',', '.'));
        const cash = form.markPaid
            ? (nextAccount?.remainingMonth ?? 0)
            : amount;

        if (cash <= 0) {
            showErrors({
                amount: 'Le montant doit être supérieur à 0.',
            });

            return;
        }

        const result = applyCashToYear({
            payments: items,
            enrollmentId: enrollment.id,
            startMonth: form.month,
            cash,
            monthlyAmount: expectedAmount,
            months,
            paidOn: todayIso(),
            method: form.method,
        });

        if (!result.ok) {
            showErrors({
                [result.error.startsWith('Mois') ? 'month' : 'amount']:
                    result.error,
            });

            return;
        }

        const previousById = new Map(items.map((item) => [item.id, item]));
        const changed = result.payments.filter((payment) => {
            const previous = previousById.get(payment.id);

            return (
                previous === undefined ||
                payment.id.startsWith('py-local-') ||
                previous.amount !== payment.amount ||
                previous.method !== payment.method ||
                previous.paidOn !== payment.paidOn
            );
        });

        setSaving(true);

        try {
            const savedRows: Payment[] = [];

            for (const payment of changed) {
                const payload = {
                    enrollmentId: payment.enrollmentId,
                    month: payment.month,
                    amount: payment.amount,
                    expectedAmount: payment.expectedAmount,
                    paidOn: payment.paidOn,
                    method: payment.method,
                };
                const isLocal = payment.id.startsWith('py-local-');

                const saved = isLocal
                    ? await apiData<Payment>(storePayment.url(), {
                          method: 'POST',
                          body: payload,
                      })
                    : await apiData<Payment>(updatePayment.url(payment.id), {
                          method: 'PUT',
                          body: payload,
                      });

                savedRows.push(saved);
            }

            setItems((current) => {
                const byKey = new Map(
                    current.map((item) => [
                        `${item.enrollmentId}:${item.month}`,
                        item,
                    ]),
                );

                for (const saved of savedRows) {
                    byKey.set(`${saved.enrollmentId}:${saved.month}`, saved);
                }

                return [...byKey.values()];
            });
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

    const monthHint =
        month === 'all' ? academicYearLabel : formatFrMonth(month);
    const classHint =
        classroomId === 'all'
            ? cycleLabel(filter.cycle)
            : (classrooms.find((item) => item.id === classroomId)?.name ??
              cycleLabel(filter.cycle));

    return (
        <>
            <Head title="Caisse : Frais" />
            <KpiGrid className="mx-6 my-4">
                <KpiCard
                    icon={CircleDollarSign}
                    label="Attendu"
                    value={formatFcfa(stats.expected)}
                    hint={`${stats.dossiers} dossier${stats.dossiers > 1 ? 's' : ''} · ${classHint} · ${monthHint}`}
                />
                <KpiCard
                    icon={Wallet}
                    label="Encaissé"
                    value={formatFcfa(stats.collected)}
                    hint={`${stats.paid} payé${stats.paid > 1 ? 's' : ''} · ${stats.partial} partiel${stats.partial > 1 ? 's' : ''}`}
                />
                <button
                    type="button"
                    className="text-left"
                    onClick={() =>
                        setStatus((current) =>
                            current === 'impaye' ? 'all' : 'impaye',
                        )
                    }
                >
                    <KpiCard
                        className={
                            status === 'impaye'
                                ? 'ring-primary ring-1 ring-inset'
                                : undefined
                        }
                        icon={AlertTriangle}
                        label="Reste dû"
                        value={formatFcfa(stats.outstanding)}
                        hint={`${stats.unpaid} impayé${stats.unpaid > 1 ? 's' : ''} · cliquer pour filtrer`}
                    />
                </button>
                <KpiCard
                    icon={Percent}
                    label="Taux de recouvrement"
                    value={`${stats.rate} %`}
                    hint={`${classHint} · ${monthHint}`}
                >
                    <div
                        className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full"
                        role="presentation"
                    >
                        <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${Math.min(stats.rate, 100)}%` }}
                        />
                    </div>
                </KpiCard>
            </KpiGrid>
            <ListPage
                embedded
                title="Frais scolaires"
                icon={Wallet}
                description={`Relevé mensuel en FCFA · ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                searchPlaceholder="Rechercher un élève..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <>
                        <SearchSelect
                            value={classroomId}
                            onValueChange={setClassroomId}
                            className="w-[11rem]"
                            aria-label="Filtrer par classe"
                            placeholder="Toutes les classes"
                            searchPlaceholder="Rechercher une classe..."
                            options={[
                                {
                                    value: 'all',
                                    label: 'Toutes les classes',
                                },
                                ...classrooms.map((classroom) => ({
                                    value: classroom.id,
                                    label: classroom.name,
                                })),
                            ]}
                        />
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
                            value={status}
                            onValueChange={(value) =>
                                setStatus(value as 'all' | PaymentStatus)
                            }
                        >
                            <SelectTrigger
                                className="w-[11rem]"
                                aria-label="Filtrer par statut"
                            >
                                <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Tous les statuts
                                </SelectItem>
                                <SelectItem value="paye">Payé</SelectItem>
                                <SelectItem value="partiel">Partiel</SelectItem>
                                <SelectItem value="impaye">Impayé</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Encaisser
                    </Button>
                }
                empty={{
                    title:
                        search.trim() ||
                        classroomId !== 'all' ||
                        month !== 'all' ||
                        status !== 'all'
                            ? 'Aucun résultat'
                            : 'Aucun paiement dans ce cycle',
                    description:
                        search.trim() ||
                        classroomId !== 'all' ||
                        month !== 'all' ||
                        status !== 'all'
                            ? undefined
                            : `Aucun versement en ${cycleLabel(filter.cycle)} pour ${academicYearLabel}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Élève
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Mois
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Banknote}>
                                    Montant
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={CircleDollarSign}>
                                    Reste
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Wallet}>
                                    Mode
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
                        {table.pageRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    {row.studentId === '' ? (
                                        <PersonCell
                                            name={row.studentName}
                                            hint={row.matricule}
                                            photoUrl={row.photoUrl}
                                        />
                                    ) : (
                                        <Link
                                            href={show(row.studentId, {
                                                query,
                                            })}
                                            className="hover:text-primary"
                                        >
                                            <PersonCell
                                                name={row.studentName}
                                                hint={row.matricule}
                                                photoUrl={row.photoUrl}
                                            />
                                        </Link>
                                    )}
                                </TableCell>
                                <TableCell>{row.classroom}</TableCell>
                                <TableCell>
                                    <span className="block">
                                        {formatFrMonth(row.month)}
                                    </span>
                                    <span className="text-muted-foreground text-[12px]">
                                        Échéance {formatFrDate(row.dueOn)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {formatFcfa(row.amount)}
                                    <span className="text-muted-foreground">
                                        {' '}
                                        / {formatFcfa(row.expectedAmount)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {formatFcfa(
                                        Math.max(
                                            0,
                                            row.expectedAmount - row.amount,
                                        ),
                                    )}
                                </TableCell>
                                <TableCell>
                                    {row.method
                                        ? cashMethodLabel(row.method)
                                        : '-'}
                                </TableCell>
                                <TableCell>
                                    <span className="flex flex-wrap items-center gap-1.5">
                                        <Badge
                                            variant={statusVariant[row.status]}
                                        >
                                            {paymentStatusLabel(row.status)}
                                        </Badge>
                                        {row.overdue ? (
                                            <Badge variant="danger">
                                                En retard
                                            </Badge>
                                        ) : null}
                                    </span>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView:
                                                row.studentId === ''
                                                    ? undefined
                                                    : () => {
                                                          router.visit(
                                                              show(
                                                                  row.studentId,
                                                                  { query },
                                                              ),
                                                          );
                                                      },
                                            onEdit: () => openCollect(row),
                                            onDelete: row.draft
                                                ? undefined
                                                : () => remove(row.id),
                                            confirm: {
                                                title: 'Supprimer le versement ?',
                                                description: `Le versement de ${row.studentName} pour ${formatFrMonth(row.month)} sera retiré du journal des frais.`,
                                            },
                                            extras: [
                                                {
                                                    label: 'Encaisser',
                                                    icon: Banknote,
                                                    disabled:
                                                        paymentAccount(
                                                            items,
                                                            row.enrollmentId,
                                                            row.month,
                                                            row.expectedAmount,
                                                        ).remainingYear <= 0,
                                                    onSelect: () =>
                                                        openCollect(row),
                                                },
                                                {
                                                    label: 'Imprimer le reçu',
                                                    icon: Printer,
                                                    disabled:
                                                        row.draft ||
                                                        row.studentId === '' ||
                                                        row.status === 'impaye',
                                                    onSelect: () => {
                                                        router.visit(
                                                            receipt(
                                                                [
                                                                    row.studentId,
                                                                    row.id,
                                                                ],
                                                                { query },
                                                            ),
                                                        );
                                                    },
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

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    account && account.paidMonth > 0
                        ? 'Compléter le versement'
                        : 'Enregistrer un encaissement'
                }
                description={
                    account
                        ? `Mensualité ${formatFcfa(expected)} · année ${formatFcfa(account.annual)} (12 mois).`
                        : `Tarif ${cycleLabel(selectedStudent?.cycle ?? filter.cycle)} : ${formatFcfa(expected)}.`
                }
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field
                    id="studentId"
                    label="Élève"
                    required
                    error={errors.studentId}
                >
                    <SearchSelect
                        id="studentId"
                        className="w-full"
                        value={form.studentId}
                        placeholder="Choisir un élève"
                        searchPlaceholder="Rechercher un élève..."
                        options={students.map((row) => ({
                            value: row.studentId,
                            label: `${row.lastName} ${row.firstName} - ${row.matricule} (${row.classroom})`,
                            keywords: `${row.name} ${row.matricule} ${row.classroom}`,
                        }))}
                        onValueChange={(value) => {
                            const nextAccount = accountFor(value, form.month);
                            clearErrors(['studentId', 'amount']);
                            setForm((current) => ({
                                ...current,
                                studentId: value,
                                amount:
                                    current.markPaid && nextAccount
                                        ? String(nextAccount.remainingMonth)
                                        : current.amount,
                            }));
                        }}
                    />
                </Field>
                <Field id="month" label="Mois" required error={errors.month}>
                    <SearchSelect
                        id="month"
                        className="w-full"
                        value={form.month}
                        placeholder="Choisir un mois"
                        searchPlaceholder="Rechercher un mois..."
                        options={months.map((value) => ({
                            value,
                            label: formatFrMonth(value),
                        }))}
                        onValueChange={(value) => {
                            const nextAccount = accountFor(
                                form.studentId,
                                value,
                            );
                            clearErrors(['month', 'amount']);
                            setForm((current) => ({
                                ...current,
                                month: value,
                                amount:
                                    current.markPaid && nextAccount
                                        ? String(nextAccount.remainingMonth)
                                        : current.amount,
                            }));
                        }}
                    />
                </Field>
                <Field
                    id="amount"
                    label="Montant encaissé"
                    required
                    error={errors.amount}
                    hint={
                        account
                            ? `Reste ce mois : ${formatFcfa(account.remainingMonth)} · reste année : ${formatFcfa(account.remainingYear)}. Un surplus est imputé sur les mois suivants, sans dépasser 12 mensualités.`
                            : undefined
                    }
                >
                    <Input
                        id="amount"
                        inputMode="numeric"
                        value={form.amount}
                        required
                        disabled={(account?.remainingYear ?? 0) <= 0}
                        onChange={(event) => {
                            clearErrors('amount');
                            setForm((current) => ({
                                ...current,
                                amount: event.target.value,
                                markPaid: false,
                            }));
                        }}
                    />
                </Field>
                <Field id="method" label="Mode de règlement" required>
                    <Select
                        value={form.method}
                        onValueChange={(value) =>
                            setForm((current) => ({
                                ...current,
                                method: value as PaymentMethod,
                            }))
                        }
                    >
                        <SelectTrigger id="method" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {METHODS.map((method) => (
                                <SelectItem key={method} value={method}>
                                    {cashMethodLabel(method)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="markPaid"
                        checked={form.markPaid}
                        disabled={(account?.remainingMonth ?? 0) <= 0}
                        onCheckedChange={(checked) => {
                            clearErrors('amount');
                            setForm((current) => ({
                                ...current,
                                markPaid: checked === true,
                                amount:
                                    checked === true && account
                                        ? String(account.remainingMonth)
                                        : current.amount,
                            }));
                        }}
                    />
                    <Label htmlFor="markPaid">Solder le mois</Label>
                </div>
            </FormSheet>
        </>
    );
}

PaymentsIndex.layout = {
    breadcrumbs: [{ title: 'Caisse', href: payments() }],
};
