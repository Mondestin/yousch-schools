import { Head } from '@inertiajs/react';
import { Wallet } from 'lucide-react';
import { EmptyState } from '@/components/sms/empty-state';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useSchoolContext } from '@/hooks/use-school-context';
import {
    academicYearMonths,
    expectedFee,
    paymentAccount,
    paymentStatusFromAmount,
} from '@/lib/school-payments';
import {
    formatFcfa,
    formatFrDate,
    formatFrMonth,
    paymentStatusLabel,
} from '@/lib/school-rows';
import { studentFiche } from '@/lib/school-students';
import { index as students } from '@/routes/students';
import type { PaymentStatus, SchoolDataset } from '@/types/school';

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
    paye: 'success',
    partiel: 'warning',
    impaye: 'danger',
};

export default function StudentPaymentsPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);

    if (!fiche) {
        return null;
    }

    const monthly = fiche.cycle ? expectedFee(catalog, fiche.cycle) : 0;
    const months = fiche.year ? academicYearMonths(fiche.year) : [];
    const account =
        fiche.enrollment && months[0]
            ? paymentAccount(
                  catalog.payments,
                  fiche.enrollment.id,
                  months[0],
                  monthly,
              )
            : null;
    const rows = months.map((month) => {
        const payment = fiche.payments.find((item) => item.month === month);
        const amount = payment?.amount ?? 0;
        const expectedAmount = payment?.expectedAmount ?? monthly;
        const status = payment
            ? payment.status
            : paymentStatusFromAmount(0, expectedAmount);

        return {
            month,
            amount,
            expectedAmount,
            remaining: Math.max(0, expectedAmount - amount),
            status,
            paidOn: payment?.paidOn ?? null,
        };
    });

    return (
        <>
            <Head title={`${fiche.name} — Paiements`} />
            <h2 className="mb-4 text-[15px] font-semibold">Paiements</h2>
            {account ? (
                <p className="text-muted-foreground mb-4 text-[13px]">
                    Année : {formatFcfa(account.paidYear)} versés sur{' '}
                    {formatFcfa(account.annual)} · reste dû{' '}
                    {formatFcfa(account.remainingYear)}.
                </p>
            ) : null}
            <div className="overflow-hidden rounded-[8px] border">
                {rows.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="Aucun paiement"
                        description="Aucun versement n’est encore enregistré pour cette année."
                    />
                ) : (
                    <Table containerClassName="rounded-none border-0">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Mois</TableHead>
                                <TableHead>Versé</TableHead>
                                <TableHead>Attendu</TableHead>
                                <TableHead>Reste</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Payé le</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.month}>
                                    <TableCell>
                                        {formatFrMonth(row.month)}
                                    </TableCell>
                                    <TableCell>
                                        {formatFcfa(row.amount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatFcfa(row.expectedAmount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatFcfa(row.remaining)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={statusVariant[row.status]}
                                        >
                                            {paymentStatusLabel(row.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {row.paidOn
                                            ? formatFrDate(row.paidOn)
                                            : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </>
    );
}

StudentPaymentsPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Fiche', href: students() },
    ],
};
