import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { BulletinLetterhead } from '@/components/sms/bulletin-letterhead';
import { DocumentStamp } from '@/components/sms/document-stamp';
import { PageShell } from '@/components/sms/page-shell';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
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

    if (!fiche) {
        return null;
    }

    const identity: Array<[string, string]> = [
        ['Numéro d’élève', fiche.student.matricule],
        ['Classe', fiche.classroomName],
        [
            'Nom(s) et prénom(s)',
            `${fiche.student.lastName} ${fiche.student.firstName}`,
        ],
        ['Date de naissance', formatFrDate(fiche.student.bornOn)],
        ['Genre', genderLabel(fiche.student.gender)],
        ['Examen', fiche.term.name],
    ];

    if (fiche.trackCode) {
        identity.splice(2, 0, ['Série', fiche.trackCode]);
    }

    return (
        <>
            <Head title={`Bulletin — ${fiche.name}`} />
            <PageShell>
                <div className="no-print mb-4 flex justify-end">
                    <Button type="button" onClick={() => window.print()}>
                        <Printer />
                        Imprimer
                    </Button>
                </div>

                <article className="print-bulletin mx-auto max-w-[210mm] bg-white p-8 text-black">
                    <header className="grid grid-cols-2 items-start gap-8">
                        <BulletinLetterhead
                            profile={fiche.profile}
                            logoUrl={fiche.profile.logoUrl}
                        />
                        <div className="text-center text-[12px] leading-5">
                            <p className="text-[14px] font-semibold uppercase">
                                {COUNTRY_NAME}
                            </p>
                            <p>{COUNTRY_MOTTO}</p>
                            <p>———————</p>
                            <p className="mt-10 text-[13px] font-medium">
                                Année scolaire {fiche.yearLabel}
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
                            {fiche.lines.map((line) => (
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
                                Mention : <strong>{fiche.mention ?? ''}</strong>
                            </p>
                            <p>
                                Résultat : <strong>{fiche.result ?? ''}</strong>
                            </p>
                            <p>
                                Rang :{' '}
                                <strong>
                                    {fiche.rank === null
                                        ? ''
                                        : `${fiche.rank === 1 ? '1er' : `${fiche.rank}e`} / ${fiche.classSize}`}
                                </strong>
                            </p>
                            <p>
                                Appréciation :{' '}
                                <strong>{fiche.appreciation}</strong>
                            </p>
                        </div>
                        <div className="space-y-3">
                            <p>
                                Total général :{' '}
                                <strong>
                                    {fiche.lines.some(
                                        (line) => line.weighted !== null,
                                    )
                                        ? formatNote(fiche.totalGeneral)
                                        : ''}
                                </strong>
                            </p>
                            <p>
                                Moyenne :{' '}
                                <strong>
                                    {fiche.average === null
                                        ? ''
                                        : formatNote(fiche.average)}
                                </strong>
                            </p>
                            <p>
                                Fait à {fiche.profile.city} le, {fiche.issuedOn}
                            </p>
                            <DocumentStamp
                                url={fiche.profile.stampUrl}
                                className="mt-4"
                            />
                            <p className="pt-6">
                                Le Directeur
                                <br />
                                <strong>{fiche.profile.directorName}</strong>
                            </p>
                        </div>
                    </section>
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
