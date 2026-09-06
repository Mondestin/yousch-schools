import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Banknote,
    ChevronDown,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    FolderOpen,
    Inbox,
    PanelLeftClose,
    PanelLeftOpen,
    Printer,
    Receipt,
    Stamp,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DocumentAuthenticityQr } from '@/components/sms/document-authenticity-qr';
import { DocumentPied } from '@/components/sms/document-pied';
import { DocumentStamp } from '@/components/sms/document-stamp';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSchoolContext } from '@/hooks/use-school-context';
import { apiData } from '@/lib/api';
import { canAccess } from '@/lib/school-access';
import { dossierFilesOf, isImageDossier } from '@/lib/school-files';
import { COUNTRY_SHORT, formatFrDate } from '@/lib/school-rows';
import {
    genderLabel,
    studentFiche,
    type StudentFiche,
} from '@/lib/school-students';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { cn } from '@/lib/utils';
import { receipt as paymentReceipt, show as paymentShow } from '@/routes/payments';
import { show as showBulletin } from '@/routes/reports';
import { documents, index as students } from '@/routes/students';
import type {
    DossierFile,
    DocumentRequest,
    IssuedDocument,
    SchoolDataset,
} from '@/types/school';

type IssuableKind =
    | 'attestation'
    | 'certificat'
    | 'attestation_reussite'
    | 'attestation_radiation'
    | 'attestation_transfert'
    | 'attestation_bourse'
    | 'certificat_conduite';

type SelectedDoc =
    | { source: 'issued'; document: IssuedDocument }
    | { source: 'dossier'; file: DossierFile }
    | { source: 'linked'; key: 'bulletin' | 'releve' | 'recu' };

type SidebarSection = 'issued' | 'requests' | 'linked' | 'dossier';

const ISSUABLE: Array<{
    kind: IssuableKind;
    title: string;
}> = [
    {
        kind: 'attestation',
        title: 'Attestation de scolarité',
    },
    {
        kind: 'certificat',
        title: 'Certificat de fréquentation',
    },
    {
        kind: 'attestation_reussite',
        title: 'Attestation de réussite / passage',
    },
    {
        kind: 'attestation_radiation',
        title: 'Attestation de radiation',
    },
    {
        kind: 'attestation_transfert',
        title: 'Attestation de transfert',
    },
    {
        kind: 'attestation_bourse',
        title: 'Attestation pour bourse / transport',
    },
    {
        kind: 'certificat_conduite',
        title: 'Certificat de bonne conduite',
    },
];

const DEFAULT_BODIES: Record<IssuableKind, string> = {
    attestation:
        'atteste que l’élève {{name}} est régulièrement inscrit(e) en classe de {{classroom}} pour l’année scolaire {{year}}.',
    certificat:
        'certifie que l’élève {{name}} fréquente régulièrement cet établissement en classe de {{classroom}} pour l’année scolaire {{year}}.',
    attestation_reussite:
        'atteste que l’élève {{name}} a satisfait aux exigences de la classe de {{classroom}} pour l’année scolaire {{year}} et est déclaré(e) admis(e) au passage.',
    attestation_radiation:
        'atteste que l’élève {{name}} a été radié(e) des effectifs. Dernière classe : {{classroom}} ({{year}}).',
    attestation_transfert:
        'atteste que l’élève {{name}} était inscrit(e) en classe de {{classroom}} pour l’année scolaire {{year}} et quitte l’établissement pour poursuivre sa scolarité ailleurs.',
    attestation_bourse:
        'atteste que l’élève {{name}} est régulièrement inscrit(e) en classe de {{classroom}} pour l’année scolaire {{year}}, pour l’appui d’une demande de bourse ou de transport.',
    certificat_conduite:
        'certifie que l’élève {{name}}, en classe de {{classroom}} pour l’année scolaire {{year}}, a fait preuve d’une bonne conduite.',
};

export default function StudentDocumentsPage({
    catalog,
    studentId,
    issuedDocuments = [],
    documentRequests = [],
}: {
    catalog: SchoolDataset;
    studentId: string;
    issuedDocuments?: IssuedDocument[];
    documentRequests?: DocumentRequest[];
}) {
    const { filter, query, staffRole } = useSchoolContext();
    const canManageDocuments = canAccess(staffRole, 'documents');
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);
    const [issued, setIssued] = useState(issuedDocuments);
    const [requests, setRequests] = useState(documentRequests);
    const [selected, setSelected] = useState<SelectedDoc | null>(() => {
        const first = issuedDocuments[0];

        return first ? { source: 'issued', document: first } : null;
    });
    const [issuing, setIssuing] = useState(false);
    const [issueOpen, setIssueOpen] = useState(false);
    const [issueKind, setIssueKind] = useState<IssuableKind>('attestation');
    const [requestNote, setRequestNote] = useState('');
    const [railCollapsed, setRailCollapsed] = useState(false);
    const [openSections, setOpenSections] = useState<
        Record<SidebarSection, boolean>
    >({
        issued: true,
        requests: true,
        linked: false,
        dossier: false,
    });

    const dossier = useMemo(
        () => dossierFilesOf(fiche?.student),
        [fiche?.student],
    );

    const paidPayments = useMemo(
        () =>
            (fiche?.payments ?? []).filter(
                (payment) =>
                    payment.status === 'paye' || payment.status === 'partiel',
            ),
        [fiche?.payments],
    );

    const pendingRequests = useMemo(
        () => requests.filter((item) => item.status === 'pending'),
        [requests],
    );

    if (!fiche) {
        return null;
    }

    const canPrint = selected?.source === 'issued';
    const selectedTitle =
        selected === null
            ? 'Documents'
            : selected.source === 'issued'
              ? selected.document.title
              : selected.source === 'dossier'
                ? selected.file.name
                : selected.key === 'bulletin'
                  ? 'Bulletin de notes'
                  : selected.key === 'releve'
                    ? 'Relevé de paiements'
                    : 'Reçus de paiement';

    function toggleSection(section: SidebarSection): void {
        setOpenSections((current) => ({
            ...current,
            [section]: !current[section],
        }));
        if (railCollapsed) {
            setRailCollapsed(false);
        }
    }

    async function issueDocument(): Promise<void> {
        setIssuing(true);

        try {
            const created = await apiData<IssuedDocument>(
                '/api/v1/issued-documents',
                {
                    method: 'POST',
                    body: {
                        studentId,
                        kind: issueKind,
                        academicYearId: filter.academicYearId,
                    },
                },
            );
            setIssued((current) => [created, ...current]);
            setSelected({ source: 'issued', document: created });
            setOpenSections((current) => ({ ...current, issued: true }));
            setIssueOpen(false);
            toastSaved('Document émis et enregistré');
        } catch (error) {
            toastApiError(error);
        } finally {
            setIssuing(false);
        }
    }

    async function requestDocument(): Promise<void> {
        setIssuing(true);

        try {
            const created = await apiData<DocumentRequest>(
                '/api/v1/document-requests',
                {
                    method: 'POST',
                    body: {
                        studentId,
                        kind: issueKind,
                        academicYearId: filter.academicYearId,
                        note: requestNote.trim() || null,
                    },
                },
            );
            setRequests((current) => [created, ...current]);
            setOpenSections((current) => ({ ...current, requests: true }));
            setIssueOpen(false);
            setRequestNote('');
            toastSaved('Demande envoyée');
        } catch (error) {
            toastApiError(error);
        } finally {
            setIssuing(false);
        }
    }

    return (
        <>
            <Head title={`${fiche.name} : Documents`} />
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                <div className="no-print flex shrink-0 items-center justify-between gap-3">
                    <h2 className="text-[15px] font-semibold">Documents</h2>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIssueKind('attestation');
                                setRequestNote('');
                                setIssueOpen(true);
                            }}
                        >
                            {canManageDocuments ? (
                                <>
                                    <Stamp />
                                    Émettre
                                </>
                            ) : (
                                <>
                                    <Inbox />
                                    Demander
                                </>
                            )}
                        </Button>
                        {canPrint ? (
                            <Button
                                type="button"
                                onClick={() => window.print()}
                            >
                                <Printer />
                                Imprimer
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div
                    className={cn(
                        'flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:grid',
                        railCollapsed
                            ? 'xl:grid-cols-[3.25rem_minmax(0,1fr)]'
                            : 'xl:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]',
                    )}
                >
                    <aside
                        className={cn(
                            'no-print flex min-h-0 flex-col overflow-hidden rounded-[10px] border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
                            'max-h-[42vh] shrink-0 xl:max-h-none xl:min-h-0',
                        )}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-2">
                            {!railCollapsed ? (
                                <p className="text-muted-foreground px-2 text-[12px] font-medium tracking-wide uppercase">
                                    Catalogue
                                </p>
                            ) : (
                                <span className="sr-only">Catalogue</span>
                            )}
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 shrink-0"
                                onClick={() =>
                                    setRailCollapsed((current) => !current)
                                }
                                aria-label={
                                    railCollapsed
                                        ? 'Agrandir le panneau'
                                        : 'Réduire le panneau'
                                }
                            >
                                {railCollapsed ? (
                                    <PanelLeftOpen className="size-4" />
                                ) : (
                                    <PanelLeftClose className="size-4" />
                                )}
                            </Button>
                        </div>

                        <TooltipProvider delayDuration={200}>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                {railCollapsed ? (
                                    <div className="flex flex-col items-center gap-1 p-2">
                                        {(
                                            [
                                                {
                                                    id: 'issued' as const,
                                                    icon: FileCheck2,
                                                    label: 'Documents émis',
                                                },
                                                {
                                                    id: 'requests' as const,
                                                    icon: Inbox,
                                                    label: 'Demandes',
                                                },
                                                {
                                                    id: 'linked' as const,
                                                    icon: FileSpreadsheet,
                                                    label: 'Déjà dans Yousch',
                                                },
                                                {
                                                    id: 'dossier' as const,
                                                    icon: FolderOpen,
                                                    label: 'Dossier',
                                                },
                                            ] as const
                                        ).map((item) => (
                                            <Tooltip key={item.id}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant={
                                                            openSections[
                                                                item.id
                                                            ]
                                                                ? 'secondary'
                                                                : 'ghost'
                                                        }
                                                        className="size-9"
                                                        onClick={() =>
                                                            toggleSection(
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        <item.icon className="size-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    {item.label}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        <DocumentGroup
                                            icon={FileCheck2}
                                            title="Documents émis"
                                            hint="Registre officiel de cet élève."
                                            count={issued.length}
                                            open={openSections.issued}
                                            onToggle={() =>
                                                toggleSection('issued')
                                            }
                                        >
                                            {issued.length === 0 ? (
                                                <p className="text-muted-foreground px-4 py-3 text-[13px]">
                                                    Aucun document émis pour le
                                                    moment.
                                                </p>
                                            ) : (
                                                issued.map((document) => {
                                                    const active =
                                                        selected?.source ===
                                                            'issued' &&
                                                        selected.document.id ===
                                                            document.id;

                                                    return (
                                                        <DocumentRow
                                                            key={document.id}
                                                            active={active}
                                                            title={
                                                                document.title
                                                            }
                                                            hint={`${document.number} · ${formatFrDate(document.issuedOn)}`}
                                                            badge={
                                                                <Badge
                                                                    variant={
                                                                        document.status ===
                                                                        'revoked'
                                                                            ? 'danger'
                                                                            : 'success'
                                                                    }
                                                                >
                                                                    {
                                                                        document.statusLabel
                                                                    }
                                                                </Badge>
                                                            }
                                                            onSelect={() =>
                                                                setSelected({
                                                                    source: 'issued',
                                                                    document,
                                                                })
                                                            }
                                                        />
                                                    );
                                                })
                                            )}
                                        </DocumentGroup>

                                        <DocumentGroup
                                            icon={Inbox}
                                            title="Demandes"
                                            hint="En attente d’approbation."
                                            count={pendingRequests.length}
                                            open={openSections.requests}
                                            onToggle={() =>
                                                toggleSection('requests')
                                            }
                                        >
                                            {requests.length === 0 ? (
                                                <p className="text-muted-foreground px-4 py-3 text-[13px]">
                                                    Aucune demande pour le
                                                    moment.
                                                </p>
                                            ) : (
                                                requests.map((item) => (
                                                    <DocumentRow
                                                        key={item.id}
                                                        active={false}
                                                        title={item.kindLabel}
                                                        hint={`${item.statusLabel}${item.createdAt ? ` · ${formatFrDate(item.createdAt.slice(0, 10))}` : ''}`}
                                                        badge={
                                                            <Badge
                                                                variant={
                                                                    item.status ===
                                                                    'pending'
                                                                        ? 'warning'
                                                                        : item.status ===
                                                                            'approved'
                                                                          ? 'success'
                                                                          : 'danger'
                                                                }
                                                            >
                                                                {
                                                                    item.statusLabel
                                                                }
                                                            </Badge>
                                                        }
                                                        onSelect={() => {
                                                            if (
                                                                item.status ===
                                                                    'approved' &&
                                                                item.issuedDocumentId
                                                            ) {
                                                                const issuedDoc =
                                                                    issued.find(
                                                                        (doc) =>
                                                                            doc.id ===
                                                                            item.issuedDocumentId,
                                                                    );
                                                                if (
                                                                    issuedDoc
                                                                ) {
                                                                    setSelected(
                                                                        {
                                                                            source: 'issued',
                                                                            document:
                                                                                issuedDoc,
                                                                        },
                                                                    );
                                                                }
                                                            }
                                                        }}
                                                    />
                                                ))
                                            )}
                                        </DocumentGroup>

                                        <DocumentGroup
                                            icon={FileSpreadsheet}
                                            title="Déjà dans Yousch"
                                            hint="Bulletin, relevé et reçus."
                                            open={openSections.linked}
                                            onToggle={() =>
                                                toggleSection('linked')
                                            }
                                        >
                                            <DocumentRow
                                                active={
                                                    selected?.source ===
                                                        'linked' &&
                                                    selected.key === 'bulletin'
                                                }
                                                title="Bulletin de notes"
                                                hint="Trimestre et moyennes"
                                                icon={FileText}
                                                onSelect={() =>
                                                    setSelected({
                                                        source: 'linked',
                                                        key: 'bulletin',
                                                    })
                                                }
                                            />
                                            <DocumentRow
                                                active={
                                                    selected?.source ===
                                                        'linked' &&
                                                    selected.key === 'releve'
                                                }
                                                title="Relevé de paiements"
                                                hint="Situation des frais scolaires"
                                                icon={Banknote}
                                                onSelect={() =>
                                                    setSelected({
                                                        source: 'linked',
                                                        key: 'releve',
                                                    })
                                                }
                                            />
                                            <DocumentRow
                                                active={
                                                    selected?.source ===
                                                        'linked' &&
                                                    selected.key === 'recu'
                                                }
                                                title="Reçus de paiement"
                                                hint={
                                                    paidPayments.length > 0
                                                        ? `${paidPayments.length} reçu(s) disponible(s)`
                                                        : 'Aucun paiement enregistré'
                                                }
                                                icon={Receipt}
                                                onSelect={() =>
                                                    setSelected({
                                                        source: 'linked',
                                                        key: 'recu',
                                                    })
                                                }
                                            />
                                        </DocumentGroup>

                                        <DocumentGroup
                                            icon={FolderOpen}
                                            title="Dossier de l’élève"
                                            hint="Pièces fournies à l’inscription."
                                            count={dossier.length}
                                            open={openSections.dossier}
                                            onToggle={() =>
                                                toggleSection('dossier')
                                            }
                                        >
                                            {dossier.length === 0 ? (
                                                <p className="text-muted-foreground px-4 py-3 text-[13px]">
                                                    Aucune pièce jointe pour le
                                                    moment.
                                                </p>
                                            ) : (
                                                dossier.map((file) => {
                                                    const active =
                                                        selected?.source ===
                                                            'dossier' &&
                                                        selected.file.id ===
                                                            file.id;

                                                    return (
                                                        <DocumentRow
                                                            key={file.id}
                                                            active={active}
                                                            title={file.name}
                                                            hint={
                                                                isImageDossier(
                                                                    file,
                                                                )
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
                                    </div>
                                )}
                            </div>
                        </TooltipProvider>
                    </aside>

                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                        {selected?.source === 'issued' ? (
                            <PaperFrame
                                title={selected.document.title}
                                subtitle={`${selected.document.number} · ${selected.document.statusLabel}`}
                            >
                                <IssuedCertificate
                                    fiche={fiche}
                                    document={selected.document}
                                    studentId={studentId}
                                />
                            </PaperFrame>
                        ) : selected?.source === 'linked' ? (
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                                <LinkedDocumentPanel
                                    linkedKey={selected.key}
                                    studentId={studentId}
                                    query={query}
                                    paidPayments={paidPayments}
                                />
                            </div>
                        ) : selected?.source === 'dossier' ? (
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                                <DossierPreview file={selected.file} />
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[10px] border bg-white">
                                <EmptyState
                                    icon={FileCheck2}
                                    title="Aucun document sélectionné"
                                    description={
                                        canManageDocuments
                                            ? 'Émettez un document officiel ou choisissez une pièce dans le catalogue.'
                                            : 'Choisissez une pièce dans le catalogue pour l’afficher.'
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FormSheet
                open={issueOpen}
                onOpenChange={setIssueOpen}
                title={
                    canManageDocuments
                        ? 'Émettre un document'
                        : 'Demander un document'
                }
                description={
                    canManageDocuments
                        ? `Enregistrement au registre pour ${fiche.name} · ${filter.academicYearLabel}.`
                        : `La demande sera examinée par le secrétariat · ${filter.academicYearLabel}.`
                }
                submitLabel={
                    canManageDocuments
                        ? 'Émettre et enregistrer'
                        : 'Envoyer la demande'
                }
                submitting={issuing}
                onSubmit={() => {
                    if (canManageDocuments) {
                        void issueDocument();
                    } else {
                        void requestDocument();
                    }
                }}
            >
                <Field id="issue-kind" label="Type de document" required>
                    <Select
                        value={issueKind}
                        onValueChange={(value) =>
                            setIssueKind(value as IssuableKind)
                        }
                    >
                        <SelectTrigger id="issue-kind">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ISSUABLE.map((item) => (
                                <SelectItem key={item.kind} value={item.kind}>
                                    {item.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                {!canManageDocuments ? (
                    <Field id="request-note" label="Motif (optionnel)">
                        <Input
                            id="request-note"
                            value={requestNote}
                            onChange={(event) =>
                                setRequestNote(event.target.value)
                            }
                            placeholder="Ex. pour inscription, bourse…"
                        />
                    </Field>
                ) : null}
            </FormSheet>

            <p className="sr-only">{selectedTitle}</p>
        </>
    );
}

function DocumentGroup({
    icon: Icon,
    title,
    hint,
    count,
    open,
    onToggle,
    children,
}: {
    icon: typeof FileCheck2;
    title: string;
    hint: string;
    count?: number;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <section>
            <button
                type="button"
                onClick={onToggle}
                className="hover:bg-muted/40 flex w-full items-start gap-2 px-3 py-3 text-left transition-colors"
                aria-expanded={open}
            >
                <Icon className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">
                            {title}
                        </span>
                        {typeof count === 'number' ? (
                            <Badge variant="code">{count}</Badge>
                        ) : null}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-[12px]">
                        {hint}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        'text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform',
                        open && 'rotate-180',
                    )}
                />
            </button>
            {open ? <ul className="pb-1">{children}</ul> : null}
        </section>
    );
}

function DocumentRow({
    title,
    hint,
    active,
    onSelect,
    badge,
    icon: RowIcon,
}: {
    title: string;
    hint: string;
    active: boolean;
    onSelect: () => void;
    badge?: ReactNode;
    icon?: typeof FileText;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'flex w-full items-start gap-3 border-l-2 px-4 py-2.5 text-left transition-colors',
                    active
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'hover:bg-muted/50 border-transparent',
                )}
            >
                {RowIcon ? (
                    <RowIcon
                        className={cn(
                            'mt-0.5 size-4 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground',
                        )}
                    />
                ) : null}
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium">{title}</span>
                        {badge}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-[12px]">
                        {hint}
                    </span>
                </span>
            </button>
        </li>
    );
}

function PaperFrame({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="no-print flex shrink-0 items-end justify-between gap-3 px-1 pb-3">
                <div>
                    <p className="text-[14px] font-semibold">{title}</p>
                    <p className="text-muted-foreground text-[12px]">
                        {subtitle}
                    </p>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[12px] border border-black/5 bg-[#ece8f1] p-3 sm:p-5 print:overflow-visible print:border-0 print:bg-transparent print:p-0">
                <div className="mx-auto max-w-[210mm] overflow-hidden rounded-[2px] bg-white shadow-[0_12px_40px_rgba(26,18,37,0.12)] print:shadow-none">
                    {children}
                </div>
            </div>
        </div>
    );
}

function LinkedDocumentPanel({
    linkedKey,
    studentId,
    query,
    paidPayments,
}: {
    linkedKey: 'bulletin' | 'releve' | 'recu';
    studentId: string;
    query: Record<string, string>;
    paidPayments: Array<{ id: string; month: string; amount: number }>;
}) {
    if (linkedKey === 'bulletin') {
        return (
            <LinkedCard
                icon={FileText}
                title="Bulletin de notes"
                description="Le bulletin est produit depuis le module Bulletins, avec QR d’authenticité."
                href={showBulletin(studentId, { query }).url}
                action="Ouvrir le bulletin"
            />
        );
    }

    if (linkedKey === 'releve') {
        return (
            <LinkedCard
                icon={Banknote}
                title="Relevé de paiements"
                description="Consultez la situation des frais et imprimez le relevé depuis la fiche paiements."
                href={paymentShow(studentId, { query }).url}
                action="Ouvrir le relevé"
            />
        );
    }

    return (
        <div className="overflow-hidden rounded-[10px] border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="border-b bg-[#faf8fc] px-5 py-4">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                    <Receipt className="text-primary size-4" />
                    Reçus de paiement
                </h2>
                <p className="text-muted-foreground mt-1 text-[13px]">
                    Chaque reçu conserve un QR d’authenticité. Ouvrez-les depuis
                    le registre des paiements.
                </p>
            </div>
            {paidPayments.length === 0 ? (
                <EmptyState
                    icon={Receipt}
                    className="py-14"
                    title="Aucun reçu"
                    description="Les reçus apparaîtront ici après enregistrement d’un paiement."
                />
            ) : (
                <ul>
                    {paidPayments.map((payment) => (
                        <li
                            key={payment.id}
                            className="flex items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0"
                        >
                            <div>
                                <p className="text-[13px] font-medium">
                                    Reçu · {payment.month}
                                </p>
                                <p className="text-muted-foreground text-[12px]">
                                    {payment.amount.toLocaleString('fr-FR')}{' '}
                                    FCFA
                                </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link
                                    href={paymentReceipt(
                                        {
                                            student: studentId,
                                            payment: payment.id,
                                        },
                                        { query },
                                    ).url}
                                >
                                    Ouvrir
                                    <ArrowUpRight />
                                </Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function LinkedCard({
    icon: Icon,
    title,
    description,
    href,
    action,
}: {
    icon: typeof FileText;
    title: string;
    description: string;
    href: string;
    action: string;
}) {
    return (
        <div className="overflow-hidden rounded-[10px] border bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="bg-primary/5 text-primary mb-4 inline-flex size-10 items-center justify-center rounded-[8px]">
                <Icon className="size-5" />
            </div>
            <h2 className="text-[16px] font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-2 max-w-lg text-[13px] leading-6">
                {description}
            </p>
            <Button asChild className="mt-5">
                <Link href={href}>
                    {action}
                    <ArrowUpRight />
                </Link>
            </Button>
        </div>
    );
}

function certificateBody(
    kind: IssuableKind,
    fiche: StudentFiche,
    name: string,
): string {
    const classroom = `${fiche.classroomName}${fiche.trackCode ? ` (série ${fiche.trackCode})` : ''}`;

    return DEFAULT_BODIES[kind]
        .replaceAll('{{name}}', name)
        .replaceAll('{{classroom}}', classroom)
        .replaceAll('{{year}}', fiche.yearLabel);
}

function IssuedCertificate({
    fiche,
    document,
    studentId,
}: {
    fiche: StudentFiche;
    document: IssuedDocument;
    studentId: string;
}) {
    const kind = (
        ISSUABLE.some((item) => item.kind === document.kind)
            ? document.kind
            : 'attestation'
    ) as IssuableKind;
    const payload = document.payload as {
        issuedOn?: string;
        classroomName?: string;
        yearLabel?: string;
        trackCode?: string | null;
        name?: string;
        templateBody?: string | null;
    };
    const issuedOnLabel =
        payload.issuedOn ??
        new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(`${document.issuedOn}T12:00:00`));
    const name = payload.name ?? fiche.name;
    const gender = genderLabel(fiche.student.gender).toLowerCase();
    const revoked = document.status === 'revoked';
    const previewFiche = {
        ...fiche,
        classroomName: payload.classroomName ?? fiche.classroomName,
        yearLabel: payload.yearLabel ?? fiche.yearLabel,
        trackCode: payload.trackCode ?? fiche.trackCode,
    };
    const bodyLead = certificateBody(kind, previewFiche, name);

    return (
        <article className="print-bulletin mx-auto max-w-[210mm] bg-white p-8 text-black sm:p-10">
            {revoked ? (
                <p className="no-print mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
                    Document révoqué
                    {document.revokeReason ? ` : ${document.revokeReason}` : '.'}
                </p>
            ) : null}
            <header className="text-center text-[13px]">
                <p className="text-[16px] font-semibold uppercase tracking-[0.02em]">
                    {fiche.profile.name}
                </p>
                <p className="text-black/70">{fiche.profile.address}</p>
                <p className="text-black/70">
                    {fiche.profile.city}, {COUNTRY_SHORT} ·{' '}
                    {fiche.profile.phone}
                </p>
                <p className="mt-2 font-mono text-[12px] tracking-wide text-black/60">
                    N° {document.number}
                </p>
            </header>
            <h1 className="mt-10 mb-8 text-center text-[20px] font-bold tracking-[0.04em] uppercase sm:text-[22px]">
                {document.title}
            </h1>
            <p className="text-[15px] leading-7">
                Je soussigné(e), <strong>{fiche.profile.directorName}</strong>,
                chef d’établissement du {fiche.profile.name}, {bodyLead} Élève{' '}
                {gender}, né(e) le {formatFrDate(fiche.student.bornOn)},
                matricule <strong>{fiche.student.matricule}</strong>.
            </p>
            <p className="mt-6 text-[15px] leading-7">
                La présente pièce est délivrée pour servir et valoir ce que de
                droit.
            </p>
            <p className="mt-10 text-right text-[14px]">
                Fait à {fiche.profile.city}, le {issuedOnLabel}
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
            {!revoked ? (
                <DocumentAuthenticityQr
                    claims={{
                        type: kind,
                        studentId,
                        refId: document.id,
                        academicYearId: document.academicYearId,
                        issuedOn: document.issuedOn,
                    }}
                    verifyUrl={document.verifyUrl}
                />
            ) : null}
            <DocumentPied />
        </article>
    );
}

function DossierPreview({ file }: { file: DossierFile }) {
    const usable = file.url !== '' && file.url !== '#';
    const image = usable && isImageDossier(file);

    return (
        <div className="overflow-hidden rounded-[10px] border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b bg-[#faf8fc] px-4 py-3">
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
                            : 'Cette pièce est enregistrée au dossier.'
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
