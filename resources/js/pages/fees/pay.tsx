import { Head } from '@inertiajs/react';
import { Banknote, Download, Phone } from 'lucide-react';
import { formatFcfa } from '@/lib/school-rows';

type PayPageProps = {
    payment: {
        id: string;
        month: string;
        monthLabel: string;
        amount: number;
        expectedAmount: number;
        dueAmount: number;
        status: string;
        statusLabel: string;
    };
    student: {
        name: string;
        matricule: string;
        classroom: string;
    };
    school: {
        name: string;
        phone: string;
        email: string;
        address: string;
        city: string;
    };
    pdfUrl: string;
};

export default function FeePayPage({
    payment,
    student,
    school,
    pdfUrl,
}: PayPageProps) {
    return (
        <>
            <Head title={`Paiement · ${student.name}`} />
            <div className="min-h-screen bg-[#f6f4f8] px-4 py-12 text-[#1a1225]">
                <div className="mx-auto w-full max-w-lg">
                    <p className="mb-6 text-center text-sm font-medium tracking-wide text-[#6425d0] uppercase">
                        Yousch · Paiement des frais
                    </p>
                    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
                        <p className="text-muted-foreground text-[12px]">
                            {school.name}
                        </p>
                        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
                            {student.name}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-[13px]">
                            {student.matricule} · {student.classroom}
                        </p>

                        <div className="mt-6 rounded-xl bg-[#f6f4f8] px-4 py-3">
                            <p className="text-[12px] text-black/60">
                                Reste à payer · {payment.monthLabel}
                            </p>
                            <p className="mt-1 text-[28px] font-semibold tracking-tight">
                                {formatFcfa(payment.dueAmount)}
                            </p>
                            <p className="mt-1 text-[13px] text-black/70">
                                Statut : {payment.statusLabel} · déjà versé{' '}
                                {formatFcfa(payment.amount)} /{' '}
                                {formatFcfa(payment.expectedAmount)}
                            </p>
                        </div>

                        <div className="mt-6 space-y-3 text-[14px] leading-6">
                            <p className="flex items-start gap-2 font-medium">
                                <Banknote className="mt-0.5 size-4 shrink-0 text-[#6425d0]" />
                                Payer par Mobile Money ou à la caisse
                            </p>
                            {school.phone ? (
                                <p className="flex items-start gap-2 text-black/80">
                                    <Phone className="mt-0.5 size-4 shrink-0" />
                                    Envoyez le montant au{' '}
                                    <strong className="mx-1">{school.phone}</strong>
                                    (indiquez le matricule {student.matricule} dans
                                    le message).
                                </p>
                            ) : (
                                <p className="text-black/80">
                                    Contactez la caisse de l’établissement pour
                                    régler ce solde.
                                </p>
                            )}
                            {school.email ? (
                                <p className="text-[13px] text-black/60">
                                    Confirmation : {school.email}
                                </p>
                            ) : null}
                        </div>

                        <a
                            href={pdfUrl}
                            className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#6425d0] px-4 text-[13px] font-medium text-white"
                        >
                            <Download className="size-4" />
                            Télécharger le relevé PDF
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
