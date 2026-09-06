import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { BulletinLetterhead } from '@/components/sms/bulletin-letterhead';
import { DocumentAuthenticityQr, useDocumentVerifyUrl } from '@/components/sms/document-authenticity-qr';
import { DocumentPied } from '@/components/sms/document-pied';
import { DocumentStamp } from '@/components/sms/document-stamp';
import { PageShell } from '@/components/sms/page-shell';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
import {
    printBulletinDocument,
    type BulletinApiFiche,
} from '@/lib/school-bulletin-pdf';
import { bulletinFiche, defaultTermId, formatNote } from '@/lib/school-grades';
import { COUNTRY_MOTTO, COUNTRY_NAME, formatFrDate } from '@/lib/school-rows';
import { genderLabel } from '@/lib/school-students';
import { index as reports } from '@/routes/reports';
import type { SchoolDataset } from '@/types/school';

function noteCell(value: number | null): string {
    return value === null ? '' : formatNote(value);
}

export default function ReportShowPage({
    catalog,
    studentId,
    termId,
}: {
    catalog: SchoolDataset;
    studentId: string;
    termId: string | null;
}) {
    const { filter } = useSchoolContext();
    const resolvedTermId = termId || defaultTermId(catalog, filter);
    const fiche = bulletinFiche(catalog, studentId, resolvedTermId);

    const authenticityClaims = {
        type: 'bulletin' as const,
        studentId,
        termId: resolvedTermId,
        academicYearId: filter.academicYearId,
        issuedOn: new Date().toISOString().slice(0, 10),
    };
    const verifyUrl = useDocumentVerifyUrl(authenticityClaims);

    if (!fiche) {
        return null;
    }

    const bulletin = fiche;

    const identity: Array<[string, string]> = [
        ['Numéro d’élève', bulletin.student.matricule],
        ['Classe', bulletin.classroomName],
        [
            'Nom(s) et prénom(s)',
            `${bulletin.student.lastName} ${bulletin.student.firstName}`,
        ],
        ['Date de naissance', formatFrDate(bulletin.student.bornOn)],
        ['Genre', genderLabel(bulletin.student.gender)],
        ['Examen', bulletin.term.name],
    ];

    if (bulletin.trackCode) {
        identity.splice(2, 0, ['Série', bulletin.trackCode]);
    }

    function printMaquette(): void {
        void printBulletinDocument(
            `Bulletin : ${bulletin.name}`,
            bulletin as BulletinApiFiche,
            { verifyUrl },
        );
    }

    return (
        <>
            <Head title={`Bulletin : ${bulletin.name}`} />
            <PageShell>
                <div className="no-print mb-4 flex justify-end">
                    <Button type="button" onClick={printMaquette}>
                        <Printer />
                        Imprimer
                    </Button>
                </div>

                <article className="print-bulletin mx-auto max-w-[210mm] bg-white p-8 text-black">
                    <header className="grid grid-cols-2 items-start gap-8">
                        <BulletinLetterhead
                            profile={bulletin.profile}
                            logoUrl={bulletin.profile.logoUrl}
                        />
                        <div className="text-center text-[12px] leading-5">
                            <p className="text-[14px] font-semibold uppercase">
                                {COUNTRY_NAME}
                            </p>
                            <p>{COUNTRY_MOTTO}</p>
                            <p>-------</p>
                            <p className="mt-10 text-[13px] font-medium">
                                Année scolaire {bulletin.yearLabel}
                            </p>
                        </div>
                    </header>

                    <h1 className="mt-8 mb-6 text-center text-[22px] font-bold uppercase">
                        Bulletin de notes
                    </h1>

                    <section className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-[14px]">
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
                                    Matière
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Moyenne de classe
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Composition
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Moyenne
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Coefficient
                                </th>
                                <th className="border px-2 py-2 font-semibold">
                                    Moyenne finale
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulletin.lines.map((line) => (
                                <tr key={line.subjectId}>
                                    <td className="border px-2 py-1.5 uppercase">
                                        {line.name}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {noteCell(line.devoir)}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {noteCell(line.composition)}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {noteCell(line.average)}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {line.coefficient}
                                    </td>
                                    <td className="border px-2 py-1.5 text-center">
                                        {noteCell(line.weighted)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <section className="mt-8 grid grid-cols-2 gap-8 text-[14px]">
                        <div className="space-y-3">
                            <p>
                                Mention :{' '}
                                <strong>{bulletin.mention ?? ''}</strong>
                            </p>
                            <p>
                                Résultat :{' '}
                                <strong>{bulletin.result ?? ''}</strong>
                            </p>
                            <p>
                                Rang :{' '}
                                <strong>
                                    {bulletin.rank === null
                                        ? ''
                                        : `${bulletin.rank === 1 ? '1er' : `${bulletin.rank}e`} / ${bulletin.classSize}`}
                                </strong>
                            </p>
                            <p>
                                Appréciation :{' '}
                                <strong>{bulletin.appreciation}</strong>
                            </p>
                        </div>
                        <div className="space-y-3">
                            <p>
                                Total général :{' '}
                                <strong>
                                    {bulletin.lines.some(
                                        (line) => line.weighted !== null,
                                    )
                                        ? formatNote(bulletin.totalGeneral)
                                        : ''}
                                </strong>
                            </p>
                            <p>
                                Moyenne :{' '}
                                <strong>
                                    {bulletin.average === null
                                        ? ''
                                        : formatNote(bulletin.average)}
                                </strong>
                            </p>
                            <p>
                                Fait à {bulletin.profile.city} le,{' '}
                                {bulletin.issuedOn}
                            </p>
                            <DocumentStamp
                                url={bulletin.profile.stampUrl}
                                className="mt-4"
                            />
                            <p className="pt-6">
                                Le Directeur
                                <br />
                                <strong>{bulletin.profile.directorName}</strong>
                            </p>
                        </div>
                    </section>
                    <DocumentAuthenticityQr
                        claims={authenticityClaims}
                        verifyUrl={verifyUrl}
                    />
                    <DocumentPied />
                </article>
            </PageShell>
        </>
    );
}

ReportShowPage.layout = {
    breadcrumbs: [
        { title: 'Bulletins', href: reports() },
        { title: 'Maquette', href: reports() },
    ],
};
