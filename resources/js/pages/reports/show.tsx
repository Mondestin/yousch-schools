import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BulletinLetterhead } from '@/components/sms/bulletin-letterhead';
import {
    DocumentAuthenticityQr,
    useDocumentVerifyUrl,
} from '@/components/sms/document-authenticity-qr';
import { DocumentPied } from '@/components/sms/document-pied';
import { DocumentStamp } from '@/components/sms/document-stamp';
import { EmptyState } from '@/components/sms/empty-state';
import { PageShell } from '@/components/sms/page-shell';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
import { apiData } from '@/lib/api';
import {
    printBulletinDocument,
    type BulletinApiFiche,
} from '@/lib/school-bulletin-pdf';
import { defaultTermId, formatNote } from '@/lib/school-grades';
import { COUNTRY_MOTTO, COUNTRY_NAME, formatFrDate } from '@/lib/school-rows';
import { genderLabel } from '@/lib/school-students';
import { toastApiError } from '@/lib/school-toast';
import { bulletin as studentBulletin } from '@/routes/api/v1/students';
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
    const [bulletin, setBulletin] = useState<BulletinApiFiche | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const authenticityClaims = {
        type: 'bulletin' as const,
        studentId,
        termId: resolvedTermId,
        academicYearId: filter.academicYearId,
        issuedOn: new Date().toISOString().slice(0, 10),
    };
    const verifyUrl = useDocumentVerifyUrl(authenticityClaims);

    useEffect(() => {
        if (!resolvedTermId) {
            setBulletin(null);
            setLoading(false);
            setError('Trimestre introuvable.');

            return;
        }

        let cancelled = false;

        setLoading(true);
        setError(null);

        void apiData<BulletinApiFiche>(
            studentBulletin.url(studentId, {
                query: { termId: resolvedTermId },
            }),
        )
            .then((data) => {
                if (!cancelled) {
                    setBulletin(data);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setBulletin(null);
                    setError('Impossible de charger le bulletin.');
                    toastApiError(err, 'Impossible de charger le bulletin');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [resolvedTermId, studentId]);

    if (loading) {
        return (
            <>
                <Head title="Bulletin" />
                <PageShell>
                    <EmptyState
                        icon={Printer}
                        title="Chargement du bulletin"
                        description="Calcul des moyennes et du rang en cours."
                    />
                </PageShell>
            </>
        );
    }

    if (!bulletin) {
        return (
            <>
                <Head title="Bulletin" />
                <PageShell>
                    <EmptyState
                        icon={Printer}
                        title="Bulletin indisponible"
                        description={
                            error ??
                            'Le bulletin n’est pas encore prêt pour cet élève.'
                        }
                    />
                </PageShell>
            </>
        );
    }

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

    function printBulletin(): void {
        void printBulletinDocument(`Bulletin : ${bulletin!.name}`, bulletin!, {
            verifyUrl,
        });
    }

    return (
        <>
            <Head title={`Bulletin : ${bulletin.name}`} />
            <PageShell>
                <div className="no-print mb-4 flex justify-end">
                    <Button type="button" onClick={printBulletin}>
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

                    <h1 className="mt-8 text-center text-[16px] font-semibold uppercase tracking-wide">
                        Bulletin de notes
                    </h1>

                    <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
                        {identity.map(([label, value]) => (
                            <p key={label}>
                                <span className="text-muted-foreground">
                                    {label} :{' '}
                                </span>
                                <strong>{value}</strong>
                            </p>
                        ))}
                    </div>

                    <table className="mt-6 w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="py-1.5 pr-2 font-semibold">
                                    Matière
                                </th>
                                <th className="py-1.5 px-2 font-semibold">
                                    Coef.
                                </th>
                                <th className="py-1.5 px-2 font-semibold">
                                    Devoir
                                </th>
                                <th className="py-1.5 px-2 font-semibold">
                                    Composition
                                </th>
                                <th className="py-1.5 px-2 font-semibold">
                                    Moyenne
                                </th>
                                <th className="py-1.5 pl-2 font-semibold">
                                    Pondéré
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulletin.lines.map((line) => (
                                <tr
                                    key={line.subjectId}
                                    className="border-b border-black/10"
                                >
                                    <td className="py-1.5 pr-2">
                                        {line.code} · {line.name}
                                    </td>
                                    <td className="py-1.5 px-2">
                                        {line.coefficient}
                                    </td>
                                    <td className="py-1.5 px-2">
                                        {noteCell(line.devoir)}
                                    </td>
                                    <td className="py-1.5 px-2">
                                        {noteCell(line.composition)}
                                    </td>
                                    <td className="py-1.5 px-2">
                                        {noteCell(line.average)}
                                    </td>
                                    <td className="py-1.5 pl-2">
                                        {noteCell(line.weighted)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-6 grid grid-cols-2 gap-6 text-[12px]">
                        <div className="space-y-1">
                            <p>
                                Mention :{' '}
                                <strong>{bulletin.mention ?? ''}</strong>
                            </p>
                            <p>
                                Décision :{' '}
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
                        <div className="space-y-1 text-right">
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
                                Moyenne générale :{' '}
                                <strong>
                                    {bulletin.average === null
                                        ? ''
                                        : formatNote(bulletin.average)}
                                </strong>
                            </p>
                            <p className="pt-4">
                                Fait à {bulletin.profile.city} le,{' '}
                                {bulletin.issuedOn}
                            </p>
                            <DocumentStamp
                                url={bulletin.profile.stampUrl}
                                className="ml-auto"
                            />
                            <p className="pt-2">
                                <strong>{bulletin.profile.directorName}</strong>
                            </p>
                            <DocumentPied
                                profile={bulletin.profile}
                                className="mt-4 text-left"
                            />
                            <DocumentAuthenticityQr
                                url={verifyUrl}
                                className="mt-3 ml-auto"
                            />
                        </div>
                    </div>
                </article>
            </PageShell>
        </>
    );
}

ReportShowPage.layout = {
    breadcrumbs: [
        { title: 'Bulletins', href: reports() },
        { title: 'Bulletin', href: '#' },
    ],
};
