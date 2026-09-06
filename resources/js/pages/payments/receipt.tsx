import { Head } from '@inertiajs/react';
import { Printer, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
import { paymentSlip } from '@/lib/school-payments';
import {
    COUNTRY_SHORT,
    formatFcfa,
    paymentStatusLabel,
} from '@/lib/school-rows';
import { index as payments } from '@/routes/payments';
import { DocumentStamp } from '@/components/sms/document-stamp';
import type { SchoolDataset } from '@/types/school';

export default function PaymentReceiptPage({
    catalog,
    studentId,
    paymentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
    paymentId: string;
}) {
    const { filter } = useSchoolContext();
    const slip = paymentSlip(
        catalog,
        studentId,
        paymentId,
        filter.academicYearId,
    );

    if (!slip) {
        return null;
    }

    return (
        <>
            <Head title={`Reçu : ${slip.name}`} />
            <PageShell>
                <PageHeader
                    className="no-print"
                    title="Reçu de paiement"
                    icon={Receipt}
                    description={`${slip.classroomName} · ${slip.payment.monthLabel}.`}
                    actions={
                        <Button type="button" onClick={() => window.print()}>
                            <Printer />
                            Imprimer
                        </Button>
                    }
                />
                <article className="print-bulletin mx-auto max-w-[180mm] bg-white p-8 text-black">
                    <p className="text-center text-[16px] font-semibold uppercase">
                        {slip.profile.name}
                    </p>
                    <p className="text-muted-foreground text-center text-[13px]">
                        {slip.profile.address} · {slip.profile.city},{' '}
                        {COUNTRY_SHORT}
                    </p>
                    <h1 className="mt-8 mb-6 text-center text-[20px] font-bold uppercase">
                        Reçu de paiement
                    </h1>
                    <dl className="space-y-2 text-[14px]">
                        <Row label="Élève" value={slip.name} />
                        <Row label="Matricule" value={slip.student.matricule} />
                        <Row label="Classe" value={slip.classroomName} />
                        <Row label="Mois" value={slip.payment.monthLabel} />
                        <Row
                            label="Montant reçu"
                            value={formatFcfa(slip.payment.amount)}
                        />
                        <Row
                            label="Net à payer"
                            value={formatFcfa(slip.payment.expectedAmount)}
                        />
                        <Row
                            label="Statut"
                            value={paymentStatusLabel(slip.payment.status)}
                        />
                        <Row
                            label="Date"
                            value={slip.payment.paidOn ?? slip.issuedOn}
                        />
                    </dl>
                    <p className="mt-10 text-right text-[13px]">
                        Fait à {slip.profile.city}, le {slip.issuedOn}
                    </p>
                    <DocumentStamp
                        url={slip.profile.stampUrl}
                        className="mt-6 ml-auto"
                    />
                    <p className="mt-4 text-right text-[13px]">
                        La caisse
                        <br />
                        <strong>{slip.profile.directorName}</strong>
                    </p>
                </article>
            </PageShell>
        </>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 border-b py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    );
}

PaymentReceiptPage.layout = {
    breadcrumbs: [{ title: 'Caisse', href: payments() }],
};
