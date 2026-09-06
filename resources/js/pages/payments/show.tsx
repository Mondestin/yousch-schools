import { Head, Link } from '@inertiajs/react';
import { Printer, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
import { receiptFiche } from '@/lib/school-payments';
import {
    COUNTRY_MOTTO,
    COUNTRY_NAME,
    COUNTRY_SHORT,
    formatFcfa,
    paymentStatusLabel,
} from '@/lib/school-rows';
import { receipt, index as payments } from '@/routes/payments';
import { DocumentAuthenticityQr } from '@/components/sms/document-authenticity-qr';
import { DocumentPied } from '@/components/sms/document-pied';
import { DocumentStamp } from '@/components/sms/document-stamp';
import type { SchoolDataset } from '@/types/school';

export default function PaymentShowPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter, query } = useSchoolContext();
    const fiche = receiptFiche(catalog, studentId, filter.academicYearId);

    if (!fiche) {
        return null;
    }

    const identity: Array<[string, string]> = [
        ['Numéro d’élève', fiche.student.matricule],
        ['Établissement', fiche.profile.name],
        ['Classe', fiche.classroomName],
        [
            'Nom(s) et prénom(s)',
            `${fiche.student.lastName} ${fiche.student.firstName}`,
        ],
    ];

    if (fiche.trackCode) {
        identity.splice(3, 0, ['Série', fiche.trackCode]);
    }

    return (
        <>
            <Head title={`Relevé : ${fiche.name}`} />
            <PageShell>
                <PageHeader
                    className="no-print"
                    title="Relevé de paiements"
                    icon={Wallet}
                    description={`${fiche.classroomName} · ${fiche.yearLabel}.`}
                    actions={
                        <Button type="button" onClick={() => window.print()}>
                            <Printer />
                            Imprimer
                        </Button>
                    }
                />

                <article className="print-bulletin mx-auto max-w-[210mm] bg-white p-8 text-black">
                    <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                        <div className="text-center text-[12px] leading-5">
                            {fiche.profile.logoUrl ? (
                                <img
                                    src={fiche.profile.logoUrl}
                                    alt=""
                                    className="mx-auto mb-2 h-24 w-32 object-contain"
                                />
                            ) : null}
                            <p className="text-[14px] font-semibold uppercase">
                                {fiche.profile.name}
                            </p>
                            <p>Tél. : {fiche.profile.phone}</p>
                            <p>E-mail : {fiche.profile.email}</p>
                            <p>{fiche.profile.address}</p>
                            <p>
                                {fiche.profile.city}, {COUNTRY_SHORT}
                            </p>
                        </div>
                        <p className="pt-8 text-center text-[13px] font-medium">
                            {fiche.profile.motto}
                        </p>
                        <div className="text-center text-[12px] leading-5">
                            <p className="text-[14px] font-semibold uppercase">
                                {COUNTRY_NAME}
                            </p>
                            <p>{COUNTRY_MOTTO}</p>
                            <p>-------</p>
                            <p className="mt-10 text-[13px] font-medium">
                                Année scolaire {fiche.yearLabel}
                            </p>
                        </div>
                    </header>

                    <h1 className="mt-8 mb-6 text-center text-[22px] font-bold uppercase">
                        Relevé de paiements
                    </h1>

                    <section className="mb-6 space-y-1 text-[14px]">
                        {identity.map(([label, value]) => (
                            <p key={label}>
                                {label}
                                <span className="mx-2">:</span>
                                <strong>{value}</strong>
                            </p>
                        ))}
                    </section>

                    <table className="w-full border-collapse border text-[13px]">
                        <thead>
                            <tr className="bg-zinc-100">
                                <th className="border px-2 py-2 text-left font-semibold">
                                    #
                                </th>
                                <th className="border px-2 py-2 text-left font-semibold">
                                    Mois
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Montant
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Reste
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Statut
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {fiche.lines.map((line, index) => (
                                <tr key={line.id}>
                                    <td className="border px-2 py-1.5">
                                        {index + 1}
                                    </td>
                                    <td className="border px-2 py-1.5">
                                        {line.posted ? (
                                            <Link
                                                href={receipt(
                                                    [studentId, line.id],
                                                    { query },
                                                )}
                                                className="hover:text-primary underline print:no-underline"
                                            >
                                                {line.monthLabel}
                                            </Link>
                                        ) : (
                                            line.monthLabel
                                        )}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {formatFcfa(line.amount)}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {formatFcfa(line.remaining)}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {paymentStatusLabel(line.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <section className="mt-8 grid grid-cols-2 gap-8 text-[14px]">
                        <div />
                        <div className="space-y-3 text-right">
                            <p>
                                Net à payer :{' '}
                                <strong>
                                    {formatFcfa(fiche.expectedTotal)}
                                </strong>
                            </p>
                            <p>
                                Total payé :{' '}
                                <strong>{formatFcfa(fiche.paidTotal)}</strong>
                            </p>
                            <p>
                                Total impayé :{' '}
                                <strong>{formatFcfa(fiche.unpaidTotal)}</strong>
                            </p>
                            <p className="pt-6 text-left">
                                Fait à {fiche.profile.city} le, {fiche.issuedOn}
                            </p>
                            <DocumentStamp
                                url={fiche.profile.stampUrl}
                                className="mt-4"
                            />
                            <p className="pt-6 text-left">
                                La Direction
                                <br />
                                <strong>{fiche.profile.directorName}</strong>
                            </p>
                        </div>
                    </section>
                    <DocumentAuthenticityQr
                        claims={{
                            type: 'payment_statement',
                            studentId,
                            academicYearId: filter.academicYearId,
                            issuedOn: new Date().toISOString().slice(0, 10),
                        }}
                    />
                    <DocumentPied />
                </article>
            </PageShell>
        </>
    );
}

PaymentShowPage.layout = {
    breadcrumbs: [
        { title: 'Caisse', href: payments() },
        { title: 'Relevé', href: payments() },
    ],
};
