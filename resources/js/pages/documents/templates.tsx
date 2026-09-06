import { Head } from '@inertiajs/react';
import { FileStack, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DATA_TABLE_CONTAINER } from '@/components/sms/data-table';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useClientTable } from '@/hooks/use-client-table';
import { apiData } from '@/lib/api';
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

const PLACEHOLDER_HINT =
    'Placeholders : {{name}}, {{matricule}}, {{classroomName}}, {{yearLabel}}, {{bornOnLabel}}, {{genderLabel}}, {{directorName}}, {{schoolName}}, {{city}}, {{issuedOn}}, {{number}}, {{trackSuffix}}';

export default function DocumentTemplatesPage({
    documentTemplates,
}: {
    catalog: SchoolDataset;
    documentTemplates: DocumentTemplate[];
}) {
    const [templates, setTemplates] = useState(documentTemplates);
    const [search, setSearch] = useState('');
    const [templateOpen, setTemplateOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] =
        useState<DocumentTemplate | null>(null);
    const [templateTitle, setTemplateTitle] = useState('');
    const [templateBody, setTemplateBody] = useState('');
    const [templateSaving, setTemplateSaving] = useState(false);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return templates.filter((template) => {
            if (needle === '') {
                return true;
            }

            return `${template.title} ${template.kind} ${template.code}`
                .toLowerCase()
                .includes(needle);
        });
    }, [search, templates]);

    const table = useClientTable(rows);

    function openTemplate(template: DocumentTemplate): void {
        setEditingTemplate(template);
        setTemplateTitle(template.title);
        setTemplateBody(template.body ?? '');
        setTemplateOpen(true);
    }

    async function saveTemplate(): Promise<void> {
        if (editingTemplate === null || templateTitle.trim() === '') {
            return;
        }

        setTemplateSaving(true);

        try {
            const saved = await apiData<DocumentTemplate>(
                `/api/v1/document-templates/${editingTemplate.id}`,
                {
                    method: 'PUT',
                    body: {
                        title: templateTitle.trim(),
                        body: templateBody.trim() || null,
                    },
                },
            );
            setTemplates((current) =>
                current.map((item) =>
                    item.id === saved.id ? saved : item,
                ),
            );
            setTemplateOpen(false);
            toastSaved('Modèle enregistré');
        } catch (error) {
            toastApiError(error);
        } finally {
            setTemplateSaving(false);
        }
    }

    return (
        <>
            <Head title="Modèles de documents" />
            <ListPage
                embedded
                title="Modèles"
                description="Textes utilisés à l’émission. Les placeholders sont remplacés automatiquement."
                icon={FileStack}
                searchPlaceholder="Rechercher un modèle..."
                search={search}
                onSearchChange={setSearch}
                empty={{
                    title: 'Aucun modèle',
                    description:
                        'Les modèles Congo sont créés automatiquement.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Titre</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((template) => (
                            <TableRow key={template.id}>
                                <TableCell>
                                    {KIND_LABEL[template.kind] ?? template.kind}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px] font-medium">
                                            {template.title}
                                        </p>
                                        <p
                                            className={cn(
                                                'text-muted-foreground line-clamp-2 text-[12px]',
                                            )}
                                        >
                                            {template.body ??
                                                'Corps par défaut'}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                                <TableCell>
                                    <RowMenu
                                        items={[
                                            {
                                                label: 'Modifier',
                                                icon: Pencil,
                                                onSelect: () =>
                                                    openTemplate(template),
                                            },
                                        ]}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <FormSheet
                open={templateOpen}
                onOpenChange={setTemplateOpen}
                title="Modifier le modèle"
                description={PLACEHOLDER_HINT}
                submitLabel="Enregistrer"
                submitting={templateSaving}
                onSubmit={() => {
                    void saveTemplate();
                }}
            >
                <Field id="template-title" label="Titre" required>
                    <Input
                        id="template-title"
                        value={templateTitle}
                        onChange={(event) =>
                            setTemplateTitle(event.target.value)
                        }
                    />
                </Field>
                <Field id="template-body" label="Corps du texte">
                    <Textarea
                        id="template-body"
                        rows={12}
                        value={templateBody}
                        onChange={(event) =>
                            setTemplateBody(event.target.value)
                        }
                    />
                </Field>
            </FormSheet>
        </>
    );
}

DocumentTemplatesPage.layout = {
    breadcrumbs: [
        { title: 'Documents', href: documentsHub() },
        { title: 'Modèles', href: documentsTemplates() },
    ],
};
