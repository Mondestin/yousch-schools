import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Banknote,
    Calendar,
    CircleDot,
    CircleDollarSign,
    EllipsisVertical,
    Mail,
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
import { PaymentMethodCell } from '@/components/sms/payment-method-cell';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchInput } from '@/components/sms/search-input';
import { SearchSelect } from '@/components/sms/search-select';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    emailReceipt as emailPaymentReceipt,
    remind as remindPayments,
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

const METHODS: PaymentMethod[] = [
    'especes',
    'mtn_money',
    'airtel_money',
    'virement',
];

const paymentSchema = z.object({
    studentId: requiredText('L’élève'),
    month: requiredText('Le mois'),
    amount: requiredAmount('Le montant'),
});

type RemindStudentGroup = {
    key: string;
    studentId: string;
    studentName: string;
    matricule: string;
    classroom: string;
    photoUrl: string | null;
    rows: FeeLedgerRow[];
    due: number;
    guardianEmail: string | null;
    lastRemindedAt: string | null;
};

function remindRowKey(row: Pick<FeeLedgerRow, 'studentId' | 'enrollmentId'>): string {
    return row.studentId || row.enrollmentId;
}

function guardianEmailForStudent(
    catalog: SchoolDataset,
    studentId: string,
): string | null {
    if (studentId === '') {
        return null;
    }

    const guardianIds = catalog.studentGuardians
        .filter((link) => link.studentId === studentId)
        .map((link) => link.guardianId);

    for (const guardianId of guardianIds) {
        const guardian = catalog.guardians.find((item) => item.id === guardianId);
        const email = guardian?.email?.trim();

        if (email) {
            return email;
        }
    }

    return null;
}

function latestRemindedAt(rows: FeeLedgerRow[]): string | null {
    let latest: string | null = null;

    for (const row of rows) {
        const value = row.lastRemindedAt ?? null;

        if (value && (!latest || value > latest)) {
            latest = value;
        }
    }

    return latest;
}

function defaultRemindMessage(schoolName: string): string {
    return `Nous vous rappelons qu’un solde reste dû pour votre enfant à ${schoolName}. Merci de régulariser auprès de la caisse ou par Mobile Money (voir le lien dans cet e-mail).`;
}

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
    const [reminding, setReminding] = useState(false);
    const [remindOpen, setRemindOpen] = useState(false);
    const [remindSearch, setRemindSearch] = useState('');
    const [remindSelected, setRemindSelected] = useState<string[]>([]);
    const [remindMessage, setRemindMessage] = useState(() =>
        defaultRemindMessage(catalog.profile.name),
    );
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
    const remindable = useMemo(
        () =>
            rows.filter(
                (row) => row.status === 'impaye' || row.status === 'partiel',
            ),
        [rows],
    );
    const remindGroups = useMemo((): RemindStudentGroup[] => {
        const byKey = new Map<string, RemindStudentGroup>();

        for (const row of remindable) {
            const key = remindRowKey(row);
            const existing = byKey.get(key);

            if (existing) {
                existing.rows.push(row);
                existing.due += Math.max(0, row.expectedAmount - row.amount);
                continue;
            }

            byKey.set(key, {
                key,
                studentId: row.studentId,
                studentName: row.studentName,
                matricule: row.matricule,
                classroom: row.classroom,
                photoUrl: row.photoUrl,
                rows: [row],
                due: Math.max(0, row.expectedAmount - row.amount),
                guardianEmail: guardianEmailForStudent(catalog, row.studentId),
                lastRemindedAt: row.lastRemindedAt ?? null,
            });
        }

        return [...byKey.values()]
            .map((group) => ({
                ...group,
                lastRemindedAt: latestRemindedAt(group.rows),
            }))
            .sort((left, right) =>
                left.studentName.localeCompare(right.studentName, 'fr'),
            );
    }, [catalog, remindable]);
    const filteredRemindGroups = useMemo(() => {
        const needle = remindSearch.trim().toLowerCase();

        if (needle === '') {
            return remindGroups;
        }

        return remindGroups.filter((group) =>
            `${group.studentName} ${group.matricule} ${group.classroom}`
                .toLowerCase()
                .includes(needle),
        );
    }, [remindGroups, remindSearch]);
    const selectedRemindRows = useMemo(
        () =>
            remindable.filter((row) =>
                remindSelected.includes(remindRowKey(row)),
            ),
        [remindSelected, remindable],
    );
    const sendableRemindRows = useMemo(
        () =>
            selectedRemindRows.filter((row) =>
                Boolean(guardianEmailForStudent(catalog, row.studentId)),
            ),
        [catalog, selectedRemindRows],
    );
    const remindableWithEmail = useMemo(
        () => remindGroups.filter((group) => Boolean(group.guardianEmail)),
        [remindGroups],
    );

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

    function openRemind(keys?: string[]): void {
        if (remindable.length === 0) {
            toastApiError(
                new Error(
                    'Aucun impayé ou partiel dans la liste filtrée.',
                ),
            );

            return;
        }

        const withEmail = remindGroups.filter((group) =>
            Boolean(group.guardianEmail),
        );

        if (withEmail.length === 0) {
            toastApiError(
                new Error(
                    'Aucun e-mail tuteur sur les élèves à relancer.',
                ),
            );

            return;
        }

        const available = new Set(withEmail.map((group) => group.key));
        const initial =
            keys && keys.length > 0
                ? keys.filter((key) => available.has(key))
                : withEmail.map((group) => group.key);

        if (keys && keys.length > 0 && initial.length === 0) {
            toastApiError(
                new Error('Aucun e-mail tuteur pour cet élève.'),
            );

            return;
        }

        setRemindSelected(initial);
        setRemindSearch('');
        setRemindMessage(defaultRemindMessage(catalog.profile.name));
        setRemindOpen(true);
    }

    function toggleRemindStudent(key: string, checked: boolean): void {
        const group = remindGroups.find((item) => item.key === key);

        if (checked && !group?.guardianEmail) {
            return;
        }

        setRemindSelected((current) => {
            if (checked) {
                return current.includes(key) ? current : [...current, key];
            }

            return current.filter((item) => item !== key);
        });
    }

    function toggleRemindAllVisible(checked: boolean): void {
        const visibleKeys = filteredRemindGroups
            .filter((group) => Boolean(group.guardianEmail))
            .map((group) => group.key);

        setRemindSelected((current) => {
            if (checked) {
                return [...new Set([...current, ...visibleKeys])];
            }

            const hide = new Set(visibleKeys);

            return current.filter((key) => !hide.has(key));
        });
    }

    async function sendReminders(): Promise<void> {
        if (sendableRemindRows.length === 0) {
            toastApiError(
                new Error(
                    'Sélectionnez au moins un élève avec e-mail tuteur.',
                ),
            );

            return;
        }

        setReminding(true);

        try {
            const response = await apiJson<{
                data: {
                    sent: number;
                    skipped: number;
                    failures: string[];
                    payments: Payment[];
                };
                message: string;
            }>(remindPayments.url(), {
                method: 'POST',
                body: {
                    message: remindMessage.trim() || null,
                    items: sendableRemindRows.map((row) => ({
                        enrollmentId: row.enrollmentId,
                        month: row.month,
                    })),
                },
            });

            setItems((current) => {
                const byKey = new Map(
                    response.data.payments.map((payment) => [
                        `${payment.enrollmentId}:${payment.month}`,
                        payment,
                    ]),
                );
                const next = current.map((payment) => {
                    const updated = byKey.get(
                        `${payment.enrollmentId}:${payment.month}`,
                    );

                    return updated ?? payment;
                });

                for (const payment of response.data.payments) {
                    const exists = next.some((item) => item.id === payment.id);

                    if (!exists) {
                        next.push(payment);
                    }
                }

                return next;
            });

            setRemindOpen(false);
            toastSaved(response.message);
            if (response.data.failures.length > 0) {
                toastApiError(
                    new Error(response.data.failures.slice(0, 3).join(' · ')),
                );
            }
            router.reload({ only: ['catalog'] });
        } catch (error) {
            toastApiError(error, 'Impossible d’envoyer les relances');
        } finally {
            setReminding(false);
        }
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
            <ListPage
                embedded
                title="Frais scolaires"
                icon={Wallet}
                stats={
                    <KpiGrid>
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
                        />
                    </KpiGrid>
                }
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
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reminding || remindable.length === 0}
                            onClick={() => {
                                openRemind();
                            }}
                        >
                            <Mail />
                            {reminding
                                ? 'Envoi…'
                                : `Relancer (${remindGroups.length})`}
                        </Button>
                        <Button type="button" size="sm" onClick={openCreate}>
                            <Plus />
                            Encaisser
                        </Button>
                    </div>
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
                                    <PaymentMethodCell method={row.method} />
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
                                    {row.lastRemindedAt ? (
                                        <span className="text-muted-foreground mt-1 block text-[11px]">
                                            Relancé le{' '}
                                            {formatFrDate(
                                                row.lastRemindedAt.slice(0, 10),
                                            )}
                                        </span>
                                    ) : null}
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
                                                    label: 'Relancer par e-mail',
                                                    icon: Mail,
                                                    disabled:
                                                        row.status === 'paye' ||
                                                        reminding ||
                                                        !guardianEmailForStudent(
                                                            catalog,
                                                            row.studentId,
                                                        ),
                                                    onSelect: () => {
                                                        openRemind([
                                                            remindRowKey(row),
                                                        ]);
                                                    },
                                                },
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
                                                    label: 'Envoyer le reçu par e-mail',
                                                    icon: Mail,
                                                    disabled:
                                                        row.draft ||
                                                        row.status ===
                                                            'impaye' ||
                                                        row.amount <= 0 ||
                                                        !guardianEmailForStudent(
                                                            catalog,
                                                            row.studentId,
                                                        ),
                                                    onSelect: () => {
                                                        void (async () => {
                                                            try {
                                                                const response =
                                                                    await apiJson<{
                                                                        message: string;
                                                                    }>(
                                                                        emailPaymentReceipt.url(
                                                                            row.id,
                                                                        ),
                                                                        {
                                                                            method: 'POST',
                                                                        },
                                                                    );
                                                                toastSaved(
                                                                    response.message,
                                                                );
                                                            } catch (error) {
                                                                toastApiError(
                                                                    error,
                                                                    'Impossible d’envoyer le reçu',
                                                                );
                                                            }
                                                        })();
                                                    },
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

            <Dialog
                open={remindOpen}
                onOpenChange={(next) => {
                    if (reminding) {
                        return;
                    }

                    setRemindOpen(next);
                }}
            >
                <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
                    <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 text-left">
                        <DialogTitle>Relancer par e-mail</DialogTitle>
                        <DialogDescription>
                            Choisissez les élèves, vérifiez l’e-mail du tuteur,
                            puis adaptez le message. Un relevé PDF et un lien de
                            paiement (Mobile Money / caisse) sont joints.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid min-h-0 flex-1 gap-4 px-6 py-4 md:grid-cols-2 md:gap-6">
                        <div className="flex min-h-0 flex-col gap-1.5">
                            <Label htmlFor="remindMessage">Message</Label>
                            <Textarea
                                id="remindMessage"
                                value={remindMessage}
                                className="h-[24rem] min-h-[24rem] resize-none [field-sizing:fixed] text-[13px]"
                                onChange={(event) => {
                                    setRemindMessage(event.target.value);
                                }}
                            />
                        </div>
                        <div className="flex min-h-0 flex-col gap-3">
                            <div className="flex shrink-0 flex-wrap items-center gap-3">
                                <SearchInput
                                    wrapperClassName="max-w-none min-w-0 flex-1"
                                    placeholder="Rechercher un élève…"
                                    value={remindSearch}
                                    onChange={(event) => {
                                        setRemindSearch(event.target.value);
                                    }}
                                />
                                <label className="flex shrink-0 items-center gap-2 text-[13px]">
                                    <Checkbox
                                        checked={
                                            filteredRemindGroups.filter(
                                                (group) =>
                                                    Boolean(
                                                        group.guardianEmail,
                                                    ),
                                            ).length > 0 &&
                                            filteredRemindGroups
                                                .filter((group) =>
                                                    Boolean(
                                                        group.guardianEmail,
                                                    ),
                                                )
                                                .every((group) =>
                                                    remindSelected.includes(
                                                        group.key,
                                                    ),
                                                )
                                        }
                                        onCheckedChange={(value) => {
                                            toggleRemindAllVisible(
                                                value === true,
                                            );
                                        }}
                                    />
                                    Tout sélectionner
                                </label>
                            </div>
                            <div className="border-border h-[24rem] min-h-[24rem] overflow-y-auto rounded-[8px] border">
                                {filteredRemindGroups.length === 0 ? (
                                    <p className="text-muted-foreground p-4 text-[13px]">
                                        Aucun élève à relancer.
                                    </p>
                                ) : (
                                    <ul className="divide-border divide-y">
                                        {filteredRemindGroups.map((group) => {
                                            const canSend = Boolean(
                                                group.guardianEmail,
                                            );
                                            const checked =
                                                canSend &&
                                                remindSelected.includes(
                                                    group.key,
                                                );
                                            const monthsLabel =
                                                group.rows.length > 1
                                                    ? `${group.rows.length} mois`
                                                    : formatFrMonth(
                                                          group.rows[0].month,
                                                      );

                                            return (
                                                <li key={group.key}>
                                                    <label
                                                        className={`flex items-start gap-3 px-3 py-2.5 ${
                                                            canSend
                                                                ? 'hover:bg-muted/40 cursor-pointer'
                                                                : 'cursor-not-allowed opacity-60'
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            className="mt-1"
                                                            checked={checked}
                                                            disabled={!canSend}
                                                            onCheckedChange={(
                                                                value,
                                                            ) => {
                                                                toggleRemindStudent(
                                                                    group.key,
                                                                    value ===
                                                                        true,
                                                                );
                                                            }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <PersonCell
                                                                name={
                                                                    group.studentName
                                                                }
                                                                hint={`${group.matricule} · ${group.classroom}`}
                                                                photoUrl={
                                                                    group.photoUrl
                                                                }
                                                            />
                                                            <p
                                                                className={`mt-1 text-[11px] ${
                                                                    canSend
                                                                        ? 'text-muted-foreground'
                                                                        : 'text-danger'
                                                                }`}
                                                            >
                                                                {canSend
                                                                    ? group.guardianEmail
                                                                    : 'Aucun e-mail tuteur'}
                                                                {group.lastRemindedAt
                                                                    ? ` · Relancé le ${formatFrDate(group.lastRemindedAt.slice(0, 10))}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                        <div className="ml-auto shrink-0 text-right text-[12px]">
                                                            <p className="font-medium">
                                                                {formatFcfa(
                                                                    group.due,
                                                                )}
                                                            </p>
                                                            <p className="text-muted-foreground">
                                                                {monthsLabel}
                                                            </p>
                                                        </div>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                            <p className="text-muted-foreground shrink-0 text-[12px]">
                                {sendableRemindRows.length} relance
                                {sendableRemindRows.length > 1 ? 's' : ''} prête
                                {sendableRemindRows.length > 1 ? 's' : ''}
                                {remindGroups.length >
                                remindableWithEmail.length
                                    ? ` · ${remindGroups.length - remindableWithEmail.length} sans e-mail ignoré${remindGroups.length - remindableWithEmail.length > 1 ? 's' : ''}`
                                    : ''}
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={reminding}
                            onClick={() => {
                                setRemindOpen(false);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                reminding || sendableRemindRows.length === 0
                            }
                            onClick={() => {
                                void sendReminders();
                            }}
                        >
                            <Mail />
                            {reminding
                                ? 'Envoi…'
                                : `Envoyer (${sendableRemindRows.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                    {method === 'mtn_money' ||
                                    method === 'airtel_money' ? (
                                        <span className="inline-flex items-center gap-2">
                                            <img
                                                src={
                                                    method === 'mtn_money'
                                                        ? '/images/MTN_lmobile_money.jpg'
                                                        : '/images/airtel-money.png'
                                                }
                                                alt=""
                                                className="h-4 w-7 rounded-[2px] object-contain"
                                            />
                                            {cashMethodLabel(method)}
                                        </span>
                                    ) : (
                                        cashMethodLabel(method)
                                    )}
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
