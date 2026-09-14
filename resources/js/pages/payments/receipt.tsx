import { Head } from '@inertiajs/react';
import { Mail, Printer, Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DocumentAuthenticityQr } from '@/components/sms/document-authenticity-qr';
import { DocumentPied } from '@/components/sms/document-pied';
import { DocumentSchoolHeader } from '@/components/sms/document-school-header';
import { DocumentSignatureBlock } from '@/components/sms/document-signature';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
import { apiJson } from '@/lib/api';
import { printDomElement } from '@/lib/school-export';
import { paymentSlip } from '@/lib/school-payments';
import { formatFcfa, paymentStatusLabel } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { emailReceipt as emailPaymentReceipt } from '@/routes/api/v1/payments';
import { index as payments } from '@/routes/payments';
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
    const [sending, setSending] = useState(false);
    const slip = paymentSlip(
        catalog,
        studentId,
        paymentId,
        filter.academicYearId,
    );

    const guardianEmail = useMemo(() => {
        const guardianIds = catalog.studentGuardians
            .filter((link) => link.studentId === studentId)
            .map((link) => link.guardianId);

        for (const guardianId of guardianIds) {
            const guardian = catalog.guardians.find(
                (item) => item.id === guardianId,
            );
            const email = guardian?.email?.trim();

            if (email) {
                return email;
            }
        }

        return null;
    }, [catalog.guardians, catalog.studentGuardians, studentId]);

    if (!slip) {
        return null;
    }

    const canEmail =
        slip.payment.amount > 0 &&
        slip.payment.status !== 'impaye' &&
        Boolean(guardianEmail);

    async function sendReceiptEmail(): Promise<void> {
        if (!canEmail || sending) {
            return;
        }

        setSending(true);

        try {
            const response = await apiJson<{ message: string }>(
                emailPaymentReceipt.url(paymentId),
                { method: 'POST' },
            );
            toastSaved(response.message);
        } catch (error) {
            toastApiError(error, 'Impossible d’envoyer le reçu');
        } finally {
            setSending(false);
        }
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
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!canEmail || sending}
                                onClick={() => {
                                    void sendReceiptEmail();
                                }}
                            >
                                <Mail />
                                {sending
                                    ? 'Envoi…'
                                    : guardianEmail
                                      ? 'Envoyer par e-mail'
                                      : 'Pas d’e-mail tuteur'}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    const node =
                                        document.querySelector<HTMLElement>(
                                            '[data-print-root="receipt"]',
                                        );
                                    if (node) {
                                        printDomElement(
                                            `Reçu : ${slip.name}`,
                                            node,
                                        );
                                    }
                                }}
                            >
                                <Printer />
                                Imprimer
                            </Button>
                        </div>
                    }
                />
                <article
                    data-print-root="receipt"
                    className="print-bulletin mx-auto max-w-[180mm] bg-white p-8 text-black"
                >
                    <DocumentSchoolHeader
                        profile={slip.profile}
                        compact
                    />
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
                    <div className="print-closing">
                        <DocumentSignatureBlock
                            city={slip.profile.city}
                            issuedOn={slip.issuedOn}
                            stampUrl={slip.profile.stampUrl}
                            role="La caisse"
                            name={slip.profile.directorName}
                        />
                        <DocumentAuthenticityQr
                            claims={{
                                type: 'payment_receipt',
                                studentId,
                                refId: paymentId,
                                academicYearId: filter.academicYearId,
                                issuedOn: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                            }}
                        />
                        <DocumentPied />
                    </div>
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
