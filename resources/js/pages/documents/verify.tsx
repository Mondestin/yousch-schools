import { Head } from '@inertiajs/react';
import { BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatFcfa, formatFrDate } from '@/lib/school-rows';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

type VerifyResult = {
    valid: boolean;
    reason: string | null;
    kindLabel: string | null;
    issuedOn: string | null;
    school: { id: string; name: string; domain: string } | null;
    student: { id: string; matricule: string; name: string } | null;
    term: { id: string; name: string } | null;
    academicYear: { id: string; label: string } | null;
    payment: { id: string; amount: number; paidOn: string | null } | null;
    documentNumber: string | null;
    documentStatus: string | null;
    documentStatusLabel: string | null;
    documentTitle: string | null;
};

export default function DocumentVerifyPage({ result }: { result: VerifyResult }) {
    return (
        <>
            <Head title={result.valid ? 'Document authentique' : 'Document non valide'} />
            <div className="min-h-screen bg-[#f6f4f8] px-4 py-12 text-[#1a1225]">
                <div className="mx-auto w-full max-w-lg">
                    <p className="mb-6 text-center text-sm font-medium tracking-wide text-[#6425d0] uppercase">
                        Yousch · Vérification
                    </p>
                    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
                        <div
                            className={cn(
                                'mb-6 flex items-start gap-3 rounded-xl px-4 py-3',
                                result.valid
                                    ? 'bg-emerald-50 text-emerald-900'
                                    : 'bg-red-50 text-red-900',
                            )}
                        >
                            {result.valid ? (
                                <ShieldCheck className="mt-0.5 size-6 shrink-0" />
                            ) : (
                                <ShieldAlert className="mt-0.5 size-6 shrink-0" />
                            )}
                            <div>
                                <p className="text-base font-semibold">
                                    {result.valid
                                        ? 'Document authentique'
                                        : 'Document non valide'}
                                </p>
                                <p className="mt-1 text-sm opacity-90">
                                    {result.valid
                                        ? 'Ce document a été émis par l’établissement indiqué ci-dessous.'
                                        : (result.reason ??
                                          'Impossible de confirmer l’authenticité de ce document.')}
                                </p>
                            </div>
                        </div>

                        {result.valid ? (
                            <dl className="space-y-4 text-sm">
                                <Row label="Type" value={result.kindLabel} />
                                <Row label="Titre" value={result.documentTitle} />
                                <Row label="N°" value={result.documentNumber} />
                                <Row label="Statut" value={result.documentStatusLabel} />
                                <Row label="Établissement" value={result.school?.name} />
                                <Row label="Élève" value={result.student?.name} />
                                <Row
                                    label="Matricule"
                                    value={result.student?.matricule}
                                />
                                {result.academicYear ? (
                                    <Row
                                        label="Année scolaire"
                                        value={result.academicYear.label}
                                    />
                                ) : null}
                                {result.term ? (
                                    <Row label="Période" value={result.term.name} />
                                ) : null}
                                {result.payment ? (
                                    <Row
                                        label="Montant"
                                        value={formatFcfa(result.payment.amount)}
                                    />
                                ) : null}
                                {result.payment?.paidOn ? (
                                    <Row
                                        label="Date de paiement"
                                        value={formatFrDate(result.payment.paidOn)}
                                    />
                                ) : null}
                                {result.issuedOn ? (
                                    <Row
                                        label="Émis le"
                                        value={formatFrDate(result.issuedOn)}
                                    />
                                ) : null}
                            </dl>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-black/60">
                                <BadgeCheck className="size-4" />
                                Vérifiez que le QR code n’a pas été altéré.
                            </div>
                        )}
                    </div>
                    <p className="mt-8 text-center text-sm text-black/50">
                        <a href={home.url()} className="text-[#6425d0] underline-offset-2 hover:underline">
                            Retour à Yousch
                        </a>
                    </p>
                </div>
            </div>
        </>
    );
}

DocumentVerifyPage.layout = null;

function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value) {
        return null;
    }

    return (
        <div className="flex justify-between gap-4 border-b border-black/5 pb-3">
            <dt className="text-black/50">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
        </div>
    );
}
