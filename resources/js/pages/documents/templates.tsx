import { Head } from '@inertiajs/react';
import { FileStack, Save } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DocumentPied } from '@/components/sms/document-pied';
import { DocumentStamp } from '@/components/sms/document-stamp';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSchoolContext } from '@/hooks/use-school-context';
import { apiData } from '@/lib/api';
import { COUNTRY_SHORT, formatFrDate } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { cn } from '@/lib/utils';
import {
    index as documentsHub,
    templates as documentsTemplates,
} from '@/routes/documents';
import type { DocumentTemplate, SchoolDataset } from '@/types/school';

const KIND_LABEL: Record<string, string> = {
    attestation: 'Attestation de scolarité',
    certificat: 'Certificat de fréquentation',
    attestation_reussite: 'Attestation de réussite',
    attestation_radiation: 'Attestation de radiation',
    attestation_transfert: 'Attestation de transfert',
    attestation_bourse: 'Attestation bourse / transport',
    certificat_conduite: 'Certificat de bonne conduite',
};

const PLACEHOLDERS = [
    'name',
    'matricule',
    'classroomName',
    'yearLabel',
    'trackSuffix',
    'bornOnLabel',
    'genderLabel',
    'directorName',
    'schoolName',
    'city',
    'address',
    'phone',
    'issuedOn',
    'number',
] as const;

export default function DocumentTemplatesPage({
    catalog,
    documentTemplates,
}: {
    catalog: SchoolDataset;
    documentTemplates: DocumentTemplate[];
}) {
    const { filter } = useSchoolContext();
    const [templates, setTemplates] = useState(documentTemplates);
    const [selectedId, setSelectedId] = useState<string | null>(
        documentTemplates[0]?.id ?? null,
    );
    const [title, setTitle] = useState(documentTemplates[0]?.title ?? '');
    const [body, setBody] = useState(documentTemplates[0]?.body ?? '');
    const [saving, setSaving] = useState(false);

    const selected = useMemo(
        () => templates.find((item) => item.id === selectedId) ?? null,
        [selectedId, templates],
    );

    const dirty =
        selected !== null &&
        (title.trim() !== selected.title ||
            (body.trim() || '') !== (selected.body ?? '').trim());

    const sampleValues = useMemo(() => {
        const issuedOn = new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date());

        return {
            name: 'Rokia Cissé',
            matricule: 'YS-2026-00072',
            classroomName: 'CM2 A',
            yearLabel: filter.academicYearLabel,
            trackSuffix: '',
            bornOnLabel: formatFrDate('2014-03-12'),
            genderLabel: 'féminin',
            directorName: catalog.profile.directorName || 'Aminata Diop',
            schoolName: catalog.profile.name,
            city: catalog.profile.city || 'Brazzaville',
            address:
                catalog.profile.address ||
                'Quartier Moungali, avenue de la Paix',
            phone: catalog.profile.phone || '06 000 00 00',
            issuedOn,
            number: 'ATT-2026-0001',
            title: title.trim() || 'Document',
        };
    }, [catalog.profile, filter.academicYearLabel, title]);

    const previewBody = useMemo(
        () => fillPlaceholders(body || '', sampleValues),
        [body, sampleValues],
    );

    function selectTemplate(template: DocumentTemplate): void {
        if (dirty && selected && selected.id !== template.id) {
            const leave = window.confirm(
                'Modifications non enregistrées. Continuer sans enregistrer ?',
            );
            if (!leave) {
                return;
            }
        }

        setSelectedId(template.id);
        setTitle(template.title);
        setBody(template.body ?? '');
    }

    function insertPlaceholder(key: string): void {
        const token = `{{${key}}}`;
        setBody((current) => {
            if (current.includes(token)) {
                return `${current}${current.endsWith(' ') || current === '' ? '' : ' '}${token}`;
            }

            return current === '' ? token : `${current}${token}`;
        });
    }

    async function saveTemplate(): Promise<void> {
        if (selected === null || title.trim() === '') {
            return;
        }

        setSaving(true);

        try {
            const saved = await apiData<DocumentTemplate>(
                `/api/v1/document-templates/${selected.id}`,
                {
                    method: 'PUT',
                    body: {
                        title: title.trim(),
                        body: body.trim() || null,
                    },
                },
            );
            setTemplates((current) =>
                current.map((item) => (item.id === saved.id ? saved : item)),
            );
            setTitle(saved.title);
            setBody(saved.body ?? '');
            toastSaved('Modèle enregistré');
        } catch (error) {
            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Modèles de documents" />
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 pt-4 pb-4">
                <div className="flex shrink-0 items-center justify-between gap-3">
                    <div>
                        <h2 className="text-[15px] font-semibold">Modèles</h2>
                        <p className="text-muted-foreground text-[12px]">
                            Aperçu papier · modification en direct ·
                            placeholders remplacés à l’émission.
                        </p>
                    </div>
                    <Button
                        type="button"
                        disabled={!dirty || saving || selected === null}
                        onClick={() => {
                            void saveTemplate();
                        }}
                    >
                        <Save />
                        {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(15rem,18rem)_minmax(16rem,22rem)_minmax(0,1fr)]">
                    <aside className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
                            <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
                                Catalogue
                            </p>
                            <Badge variant="code">{templates.length}</Badge>
                        </div>
                        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            {templates.map((template) => {
                                const active = template.id === selectedId;

                                return (
                                    <li key={template.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                selectTemplate(template)
                                            }
                                            className={cn(
                                                'flex w-full items-start gap-2 border-l-2 px-3 py-2.5 text-left transition-colors',
                                                active
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:bg-muted/50 border-transparent',
                                            )}
                                        >
                                            <FileStack
                                                className={cn(
                                                    'mt-0.5 size-4 shrink-0',
                                                    active
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground',
                                                )}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[13px] font-medium">
                                                    {template.title}
                                                </span>
                                                <span className="text-muted-foreground mt-0.5 block text-[12px]">
                                                    {KIND_LABEL[
                                                        template.kind
                                                    ] ?? template.kind}
                                                </span>
                                            </span>
                                            <Badge
                                                variant={
                                                    template.isActive
                                                        ? 'success'
                                                        : 'muted'
                                                }
                                            >
                                                {template.isActive
                                                    ? 'Actif'
                                                    : 'Inactif'}
                                            </Badge>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    <section className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-[10px] border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        {selected === null ? (
                            <EmptyState
                                icon={FileStack}
                                title="Aucun modèle"
                                description="Les modèles Congo sont créés automatiquement."
                            />
                        ) : (
                            <>
                                <Field id="template-title" label="Titre" required>
                                    <Input
                                        id="template-title"
                                        value={title}
                                        onChange={(event) =>
                                            setTitle(event.target.value)
                                        }
                                    />
                                </Field>
                                <Field
                                    id="template-body"
                                    label="Corps du texte"
                                    hint="Utilisez les placeholders ci-dessous. L’aperçu se met à jour immédiatement."
                                >
                                    <Textarea
                                        id="template-body"
                                        value={body}
                                        onChange={(event) =>
                                            setBody(event.target.value)
                                        }
                                        className="min-h-[12rem] resize-none font-mono text-[12px] leading-5 xl:min-h-[18rem]"
                                    />
                                </Field>
                                <div className="shrink-0 space-y-2">
                                    <p className="text-muted-foreground text-[12px] font-medium">
                                        Insérer un placeholder
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PLACEHOLDERS.map((key) => (
                                            <Button
                                                key={key}
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 font-mono text-[11px]"
                                                onClick={() =>
                                                    insertPlaceholder(key)
                                                }
                                            >
                                                {`{{${key}}}`}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                        {selected === null ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center rounded-[10px] border bg-white">
                                <EmptyState
                                    icon={FileStack}
                                    title="Sélectionnez un modèle"
                                    description="L’aperçu papier s’affiche ici."
                                />
                            </div>
                        ) : (
                            <PaperFrame
                                title={title.trim() || selected.title}
                                subtitle={
                                    dirty
                                        ? 'Aperçu live · modifications non enregistrées'
                                        : 'Aperçu live · modèle enregistré'
                                }
                            >
                                <TemplateCertificate
                                    profile={catalog.profile}
                                    title={title.trim() || selected.title}
                                    body={previewBody}
                                    number={sampleValues.number}
                                    issuedOn={sampleValues.issuedOn}
                                    directorName={sampleValues.directorName}
                                    city={sampleValues.city}
                                />
                            </PaperFrame>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function fillPlaceholders(
    source: string,
    values: Record<string, string>,
): string {
    return source.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
        return values[key] ?? `{{${key}}}`;
    });
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
            <div className="flex shrink-0 items-end justify-between gap-3 px-1 pb-3">
                <div>
                    <p className="text-[14px] font-semibold">{title}</p>
                    <p className="text-muted-foreground text-[12px]">
                        {subtitle}
                    </p>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[12px] border border-black/5 bg-[#ece8f1] p-3 sm:p-5">
                <div className="mx-auto max-w-[210mm] overflow-hidden rounded-[2px] bg-white shadow-[0_12px_40px_rgba(26,18,37,0.12)]">
                    {children}
                </div>
            </div>
        </div>
    );
}

function TemplateCertificate({
    profile,
    title,
    body,
    number,
    issuedOn,
    directorName,
    city,
}: {
    profile: SchoolDataset['profile'];
    title: string;
    body: string;
    number: string;
    issuedOn: string;
    directorName: string;
    city: string;
}) {
    const paragraphs = body
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

    return (
        <article className="print-bulletin mx-auto max-w-[210mm] bg-white p-8 text-black sm:p-10">
            <header className="text-center text-[13px]">
                <p className="text-[16px] font-semibold uppercase tracking-[0.02em]">
                    {profile.name}
                </p>
                <p className="text-black/70">
                    {profile.address || 'Adresse de l’établissement'}
                </p>
                <p className="text-black/70">
                    {profile.city || 'Brazzaville'}, {COUNTRY_SHORT}
                    {profile.phone ? ` · ${profile.phone}` : ''}
                </p>
                <p className="mt-2 font-mono text-[12px] tracking-wide text-black/60">
                    N° {number}
                </p>
            </header>
            <h1 className="mt-10 mb-8 text-center text-[20px] font-bold tracking-[0.04em] uppercase sm:text-[22px]">
                {title}
            </h1>
            <div className="space-y-4 text-[15px] leading-7 whitespace-pre-wrap">
                {paragraphs.length > 0 ? (
                    paragraphs.map((paragraph, index) => (
                        <p key={`${index}-${paragraph.slice(0, 24)}`}>
                            {paragraph}
                        </p>
                    ))
                ) : (
                    <p className="text-black/40 italic">
                        Saisissez le corps du modèle pour voir l’aperçu.
                    </p>
                )}
            </div>
            <p className="mt-10 text-right text-[14px]">
                Fait à {city}, le {issuedOn}
            </p>
            <DocumentStamp
                url={profile.stampUrl}
                className="mt-6 ml-auto"
            />
            <p className="mt-8 text-right text-[14px] font-medium">
                Le chef d’établissement
                <br />
                {directorName}
            </p>
            <DocumentPied />
        </article>
    );
}

DocumentTemplatesPage.layout = {
    breadcrumbs: [
        { title: 'Documents', href: documentsHub() },
        { title: 'Modèles', href: documentsTemplates() },
    ],
};
