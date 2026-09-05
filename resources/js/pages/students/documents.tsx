import { Head } from '@inertiajs/react';
import { FileBadge2, FileText, FolderOpen, Printer } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DocumentStamp } from '@/components/sms/document-stamp';
import { EmptyState } from '@/components/sms/empty-state';
import { PageHeader } from '@/components/sms/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/hooks/use-school-context';
import { dossierFilesOf, isImageDossier } from '@/lib/school-files';
import { COUNTRY_SHORT, formatFrDate } from '@/lib/school-rows';
import {
    genderLabel,
    studentFiche,
    type StudentFiche,
} from '@/lib/school-students';
import { cn } from '@/lib/utils';
import { documents, index as students } from '@/routes/students';
import type { DossierFile, SchoolDataset } from '@/types/school';

type GeneratedKind = 'attestation' | 'certificat';

type SelectedDoc =
    | { source: 'generated'; kind: GeneratedKind }
    | { source: 'dossier'; file: DossierFile };

const GENERATED: Array<{
    kind: GeneratedKind;
    title: string;
    hint: string;
}> = [
    {
        kind: 'attestation',
        title: 'Attestation de scolarité',
        hint: 'Inscription, bourse ou transport',
    },
    {
        kind: 'certificat',
        title: 'Certificat de fréquentation',
        hint: 'Présence régulière dans l’établissement',
    },
];

export default function StudentDocumentsPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);
    const [selected, setSelected] = useState<SelectedDoc>({
        source: 'generated',
        kind: 'attestation',
    });

    const dossier = useMemo(
        () => dossierFilesOf(fiche?.student),
        [fiche?.student],
    );

    if (!fiche) {
        return null;
    }

    const issuedOn = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
    const canPrint = selected.source === 'generated';
    const selectedTitle =
        selected.source === 'generated'
            ? GENERATED.find((item) => item.kind === selected.kind)?.title
            : selected.file.name;

    return (
        <>
            <Head title={`Documents — ${fiche.name}`} />
            <PageHeader
                className="no-print"
                title="Documents"
                icon={FileBadge2}
                description="Pièces générées par l’établissement et dossier de l’élève."
                actions={
                    canPrint ? (
                        <Button type="button" onClick={() => window.print()}>
                            <Printer />
                            Imprimer
                        </Button>
                    ) : null
                }
            />
            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
                <aside className="no-print space-y-5">
                    <DocumentGroup
                        icon={FileBadge2}
                        title="Établissement"
                        hint="Documents générés à partir de la fiche."
                    >
                        {GENERATED.map((item) => {
                            const active =
                                selected.source === 'generated' &&
                                selected.kind === item.kind;

                            return (
                                <DocumentRow
                                    key={item.kind}
                                    active={active}
                                    title={item.title}
                                    hint={item.hint}
                                    onSelect={() =>
                                        setSelected({
                                            source: 'generated',
                                            kind: item.kind,
                                        })
                                    }
                                />
                            );
                        })}
                    </DocumentGroup>
                    <DocumentGroup
                        icon={FolderOpen}
                        title="Dossier de l’élève"
                        hint="Pièces fournies à l’inscription."
                    >
                        {dossier.length === 0 ? (
                            <p className="text-muted-foreground px-4 py-3 text-[13px]">
                                Aucune pièce jointe pour le moment.
                            </p>
                        ) : (
                            dossier.map((file) => {
                                const active =
                                    selected.source === 'dossier' &&
                                    selected.file.id === file.id;

                                return (
                                    <DocumentRow
                                        key={file.id}
                                        active={active}
                                        title={file.name}
                                        hint={
                                            isImageDossier(file)
                                                ? 'Image'
                                                : 'Fichier'
                                        }
                                        onSelect={() =>
                                            setSelected({
                                                source: 'dossier',
                                                file,
                                            })
                                        }
                                    />
                                );
                            })
                        )}
                    </DocumentGroup>
                </aside>
                <div>
                    {selected.source === 'generated' ? (
                        <SchoolCertificate
                            fiche={fiche}
                            kind={selected.kind}
                            issuedOn={issuedOn}
                        />
                    ) : (
                        <DossierPreview file={selected.file} />
                    )}
                </div>
            </div>
            <p className="sr-only">{selectedTitle}</p>
        </>
    );
}

function DocumentGroup({
    icon: Icon,
    title,
    hint,
    children,
}: {
    icon: typeof FileBadge2;
    title: string;
    hint: string;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-[8px] border">
            <header className="border-b px-4 py-3">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold">
                    <Icon className="text-primary size-4" />
                    {title}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-[12px]">
                    {hint}
                </p>
            </header>
            <ul>{children}</ul>
        </section>
    );
}

function DocumentRow({
    title,
    hint,
    active,
    onSelect,
}: {
    title: string;
    hint: string;
    active: boolean;
    onSelect: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'flex w-full flex-col items-start gap-0.5 border-b px-4 py-3 text-left last:border-b-0',
                    active
                        ? 'bg-primary/5 text-foreground'
                        : 'hover:bg-muted/60',
                )}
            >
                <span className="text-[13px] font-medium">{title}</span>
                <span className="text-muted-foreground text-[12px]">
                    {hint}
                </span>
            </button>
        </li>
    );
}

function SchoolCertificate({
    fiche,
    kind,
    issuedOn,
}: {
    fiche: StudentFiche;
    kind: GeneratedKind;
    issuedOn: string;
}) {
    const gender = genderLabel(fiche.student.gender).toLowerCase();
    const title =
        kind === 'attestation'
            ? 'Attestation de scolarité'
            : 'Certificat de fréquentation';

    return (
        <article className="print-bulletin mx-auto max-w-[210mm] bg-white p-8 text-black">
            <header className="text-center text-[13px]">
                <p className="text-[16px] font-semibold uppercase">
                    {fiche.profile.name}
                </p>
                <p>{fiche.profile.address}</p>
                <p>
                    {fiche.profile.city}, {COUNTRY_SHORT} ·{' '}
                    {fiche.profile.phone}
                </p>
            </header>
            <h1 className="mt-10 mb-8 text-center text-[22px] font-bold uppercase">
                {title}
            </h1>
            {kind === 'attestation' ? (
                <p className="text-[15px] leading-7">
                    Je soussigné(e),{' '}
                    <strong>{fiche.profile.directorName}</strong>, chef
                    d’établissement du {fiche.profile.name}, atteste que l’élève{' '}
                    <strong>{fiche.name}</strong>, {gender}, né(e) le{' '}
                    {formatFrDate(fiche.student.bornOn)}, matricule{' '}
                    <strong>{fiche.student.matricule}</strong>, est
                    régulièrement inscrit(e) en classe de{' '}
                    <strong>{fiche.classroomName}</strong>
                    {fiche.trackCode ? ` (série ${fiche.trackCode})` : ''} pour
                    l’année scolaire <strong>{fiche.yearLabel}</strong>.
                </p>
            ) : (
                <p className="text-[15px] leading-7">
                    Je soussigné(e),{' '}
                    <strong>{fiche.profile.directorName}</strong>, chef
                    d’établissement du {fiche.profile.name}, certifie que
                    l’élève <strong>{fiche.name}</strong>, {gender}, né(e) le{' '}
                    {formatFrDate(fiche.student.bornOn)}, matricule{' '}
                    <strong>{fiche.student.matricule}</strong>, fréquente
                    régulièrement cet établissement en classe de{' '}
                    <strong>{fiche.classroomName}</strong>
                    {fiche.trackCode ? ` (série ${fiche.trackCode})` : ''} pour
                    l’année scolaire <strong>{fiche.yearLabel}</strong>.
                </p>
            )}
            <p className="mt-6 text-[15px] leading-7">
                La présente{' '}
                {kind === 'attestation' ? 'attestation' : 'certificat'} est
                délivrée pour servir et valoir ce que de droit.
            </p>
            <p className="mt-10 text-right text-[14px]">
                Fait à {fiche.profile.city}, le {issuedOn}
            </p>
            <DocumentStamp
                url={fiche.profile.stampUrl}
                className="mt-6 ml-auto"
            />
            <p className="mt-8 text-right text-[14px] font-medium">
                Le chef d’établissement
                <br />
                {fiche.profile.directorName}
            </p>
        </article>
    );
}

function DossierPreview({ file }: { file: DossierFile }) {
    const usable = file.url !== '' && file.url !== '#';
    const image = usable && isImageDossier(file);

    return (
        <div className="overflow-hidden rounded-[8px] border">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">
                        {file.name}
                    </p>
                    <p className="text-muted-foreground text-[12px]">
                        Pièce du dossier
                    </p>
                </div>
                <Badge variant="code">
                    {image ? 'Image' : (file.mime.split('/')[1] ?? 'fichier')}
                </Badge>
            </div>
            {image ? (
                <img
                    src={file.url}
                    alt=""
                    className="bg-muted/40 mx-auto max-h-[32rem] w-full object-contain p-6"
                />
            ) : (
                <EmptyState
                    icon={FileText}
                    className="py-16"
                    title={
                        usable ? 'Aperçu non disponible' : 'Pièce de dossier'
                    }
                    description={
                        usable
                            ? 'Ouvrez le fichier pour le consulter.'
                            : 'Cette pièce est enregistrée au dossier. L’aperçu n’est pas disponible en démonstration.'
                    }
                />
            )}
            {usable && !image ? (
                <div className="border-t px-4 py-3 text-right">
                    <Button asChild variant="outline">
                        <a href={file.url} target="_blank" rel="noreferrer">
                            Ouvrir
                        </a>
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

StudentDocumentsPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Documents', href: documents('st-8') },
    ],
};
