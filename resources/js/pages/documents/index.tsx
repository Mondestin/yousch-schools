import { Head, router } from '@inertiajs/react';
import {
    ExternalLink,
    FileBadge2,
    FileCheck2,
    Files,
    Hash,
    ShieldOff,
    Stamp,
    UserPlus,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchSelect } from '@/components/sms/search-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useClientTable } from '@/hooks/use-client-table';
import { useSchoolContext } from '@/hooks/use-school-context';
import { apiData } from '@/lib/api';
import { cycleLabel, formatFrDate, studentRows, todayIso } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { index as documentsHub } from '@/routes/documents';
import { documents as studentDocuments } from '@/routes/students';
import type { IssuedDocument, SchoolDataset } from '@/types/school';

const KIND_LABEL: Record<string, string> = {
    attestation: 'Attestation de scolarité',
    certificat: 'Certificat de fréquentation',
    attestation_reussite: 'Attestation de réussite',
    attestation_radiation: 'Attestation de radiation',
    attestation_transfert: 'Attestation de transfert',
    attestation_bourse: 'Attestation bourse / transport',
    certificat_conduite: 'Certificat de bonne conduite',
};

const ISSUABLE_KINDS = [
    'attestation',
    'certificat',
    'attestation_reussite',
    'attestation_radiation',
    'attestation_transfert',
    'attestation_bourse',
    'certificat_conduite',
] as const;

type IssuableKind = (typeof ISSUABLE_KINDS)[number];

type BulkResult = {
    created: IssuedDocument[];
    failed: Array<{ studentId: string; message: string }>;
    createdCount: number;
    failedCount: number;
};

export default function DocumentsIndexPage({
    catalog,
    issuedDocuments,
}: {
    catalog: SchoolDataset;
    issuedDocuments: IssuedDocument[];
}) {
    const { filter, academicYearLabel } = useSchoolContext();
    const [items, setItems] = useState(issuedDocuments);
    const [search, setSearch] = useState('');
    const [kind, setKind] = useState<'all' | IssuableKind>('all');
    const [status, setStatus] = useState<'all' | 'issued' | 'revoked'>('all');
    const [busyId, setBusyId] = useState<string | null>(null);

    const [issueOpen, setIssueOpen] = useState(false);
    const [issueStudentId, setIssueStudentId] = useState('');
    const [issueKind, setIssueKind] = useState<IssuableKind>('attestation');
    const [issueSaving, setIssueSaving] = useState(false);

    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkClassroomId, setBulkClassroomId] = useState('');
    const [bulkKind, setBulkKind] = useState<IssuableKind>('attestation');
    const [bulkSaving, setBulkSaving] = useState(false);

    const classrooms = useMemo(
        () =>
            catalog.classrooms
                .filter(
                    (classroom) =>
                        classroom.cycle === filter.cycle &&
                        classroom.academicYearId === filter.academicYearId,
                )
                .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        [catalog.classrooms, filter.academicYearId, filter.cycle],
    );

    const students = useMemo(() => {
        const seen = new Set<string>();

        return studentRows(catalog, filter)
            .filter((row) => {
                if (seen.has(row.studentId)) {
                    return false;
                }

                seen.add(row.studentId);

                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }, [catalog, filter]);

    const bulkCount = useMemo(() => {
        if (bulkClassroomId === '') {
            return 0;
        }

        return catalog.enrollments.filter(
            (enrollment) =>
                enrollment.classroomId === bulkClassroomId &&
                enrollment.academicYearId === filter.academicYearId,
        ).length;
    }, [bulkClassroomId, catalog.enrollments, filter.academicYearId]);

    const stats = useMemo(() => {
        const monthPrefix = todayIso().slice(0, 7);
        const issued = items.filter((item) => item.status === 'issued').length;
        const revoked = items.filter((item) => item.status === 'revoked').length;
        const thisMonth = items.filter((item) =>
            item.issuedOn.startsWith(monthPrefix),
        ).length;

        return {
            total: items.length,
            issued,
            revoked,
            thisMonth,
        };
    }, [items]);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return items.filter((item) => {
            if (kind !== 'all' && item.kind !== kind) {
                return false;
            }

            if (status !== 'all' && item.status !== status) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return `${item.number} ${item.title} ${item.studentName ?? ''} ${item.studentMatricule ?? ''}`
                .toLowerCase()
                .includes(needle);
        });
    }, [items, kind, search, status]);

    const table = useClientTable(rows);

    async function revoke(document: IssuedDocument): Promise<void> {
        setBusyId(document.id);

        try {
            const updated = await apiData<IssuedDocument>(
                `/api/v1/issued-documents/${document.id}/revoke`,
                {
                    method: 'POST',
                    body: { reason: null },
                },
            );
            setItems((current) =>
                current.map((item) =>
                    item.id === document.id ? updated : item,
                ),
            );
            toastSaved('Document révoqué');
        } catch (error) {
            toastApiError(error);
        } finally {
            setBusyId(null);
        }
    }

    async function runIssue(): Promise<void> {
        if (issueStudentId === '') {
            return;
        }

        setIssueSaving(true);

        try {
            const created = await apiData<IssuedDocument>(
                '/api/v1/issued-documents',
                {
                    method: 'POST',
                    body: {
                        studentId: issueStudentId,
                        kind: issueKind,
                        academicYearId: filter.academicYearId,
                    },
                },
            );
            setItems((current) => [created, ...current]);
            setIssueOpen(false);
            toastSaved('Document émis et enregistré');
        } catch (error) {
            toastApiError(error);
        } finally {
            setIssueSaving(false);
        }
    }

    async function runBulk(): Promise<void> {
        if (bulkClassroomId === '') {
            return;
        }

        setBulkSaving(true);

        try {
            const result = await apiData<BulkResult>(
                '/api/v1/issued-documents/bulk',
                {
                    method: 'POST',
                    body: {
                        classroomId: bulkClassroomId,
                        kind: bulkKind,
                        academicYearId: filter.academicYearId,
                    },
                },
            );

            setItems((current) => [...result.created, ...current]);
            setBulkOpen(false);
            toastSaved(
                result.failedCount > 0
                    ? `${result.createdCount} émis, ${result.failedCount} en échec`
                    : `${result.createdCount} document(s) émis`,
            );
        } catch (error) {
            toastApiError(error);
        } finally {
            setBulkSaving(false);
        }
    }

    return (
        <>
            <Head title="Documents" />
            <ListPage
                embedded
                title="Registre"
                description="Attestations et certificats émis par l’établissement."
                icon={FileBadge2}
                searchPlaceholder="N°, élève, matricule..."
                search={search}
                onSearchChange={setSearch}
                stats={
                    <KpiGrid>
                        <KpiCard
                            icon={Files}
                            label="Au registre"
                            value={String(stats.total)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                        <KpiCard
                            icon={FileCheck2}
                            label="Émis"
                            value={String(stats.issued)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                        <KpiCard
                            icon={ShieldOff}
                            label="Révoqués"
                            value={String(stats.revoked)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                        <KpiCard
                            icon={Stamp}
                            label="Ce mois"
                            value={String(stats.thisMonth)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                    </KpiGrid>
                }
                filters={
                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={kind}
                            onValueChange={(value) =>
                                setKind(value as 'all' | IssuableKind)
                            }
                        >
                            <SelectTrigger className="w-[10.5rem]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Tous les types
                                </SelectItem>
                                {ISSUABLE_KINDS.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {KIND_LABEL[value]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={status}
                            onValueChange={(value) =>
                                setStatus(
                                    value as 'all' | 'issued' | 'revoked',
                                )
                            }
                        >
                            <SelectTrigger className="w-[9.5rem]">
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="issued">Émis</SelectItem>
                                <SelectItem value="revoked">
                                    Révoqué
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                }
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                setIssueStudentId(students[0]?.studentId ?? '');
                                setIssueKind('attestation');
                                setIssueOpen(true);
                            }}
                        >
                            <UserPlus />
                            Émettre
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                                setBulkClassroomId(classrooms[0]?.id ?? '');
                                setBulkKind('attestation');
                                setBulkOpen(true);
                            }}
                        >
                            <Stamp />
                            En masse
                        </Button>
                    </div>
                }
                empty={{
                    title: 'Aucun document émis',
                    description:
                        'Émettez pour un élève, en masse, ou approuvez une demande.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    N°
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={FileBadge2}>
                                    Document
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={UserRound}>
                                    Élève
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>Émis le</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-[12px]">
                                    {item.number}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px] font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-muted-foreground text-[12px]">
                                            {KIND_LABEL[item.kind] ?? item.kind}
                                            {item.yearLabel
                                                ? ` · ${item.yearLabel}`
                                                : ''}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px]">
                                            {item.studentName ?? '-'}
                                        </p>
                                        <p className="text-muted-foreground font-mono text-[12px]">
                                            {item.studentMatricule ?? ''}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {formatFrDate(item.issuedOn)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            item.status === 'revoked'
                                                ? 'danger'
                                                : 'success'
                                        }
                                    >
                                        {item.statusLabel}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <RowMenu
                                        items={[
                                            {
                                                label: 'Fiche élève',
                                                icon: UserRound,
                                                onSelect: () => {
                                                    router.visit(
                                                        studentDocuments(
                                                            item.studentId,
                                                        ).url,
                                                    );
                                                },
                                            },
                                            ...(item.fileUrl
                                                ? [
                                                      {
                                                          label: 'Ouvrir le fichier',
                                                          icon: ExternalLink,
                                                          onSelect: () => {
                                                              window.open(
                                                                  item.fileUrl!,
                                                                  '_blank',
                                                                  'noreferrer',
                                                              );
                                                          },
                                                      },
                                                  ]
                                                : []),
                                            ...(item.status === 'issued'
                                                ? [
                                                      {
                                                          label: 'Révoquer',
                                                          icon: ShieldOff,
                                                          destructive: true,
                                                          disabled:
                                                              busyId ===
                                                              item.id,
                                                          confirm: {
                                                              title: 'Révoquer ce document ?',
                                                              description: `${item.number} ne sera plus considéré comme authentique.`,
                                                          },
                                                          onSelect: () => {
                                                              void revoke(item);
                                                          },
                                                      },
                                                  ]
                                                : []),
                                        ]}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <FormSheet
                open={issueOpen}
                onOpenChange={setIssueOpen}
                title="Émettre un document"
                description={`Enregistrement au registre · ${academicYearLabel}.`}
                submitLabel="Émettre et enregistrer"
                submitting={issueSaving}
                onSubmit={() => {
                    void runIssue();
                }}
            >
                <Field id="issue-student" label="Élève" required>
                    <SearchSelect
                        value={issueStudentId}
                        onValueChange={setIssueStudentId}
                        placeholder="Choisir un élève"
                        searchPlaceholder="Rechercher un élève..."
                        options={students.map((row) => ({
                            value: row.studentId,
                            label: `${row.name} · ${row.matricule}`,
                        }))}
                    />
                </Field>
                <Field id="issue-kind" label="Type" required>
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
                            {ISSUABLE_KINDS.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {KIND_LABEL[value]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FormSheet>

            <FormSheet
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                title="Émettre en masse"
                description="Crée un document officiel pour chaque élève inscrit dans la classe."
                submitLabel={
                    bulkCount > 0 ? `Émettre (${bulkCount})` : 'Émettre'
                }
                submitting={bulkSaving}
                onSubmit={() => {
                    void runBulk();
                }}
            >
                <Field id="bulk-classroom" label="Classe" required>
                    <SearchSelect
                        value={bulkClassroomId}
                        onValueChange={setBulkClassroomId}
                        placeholder="Choisir une classe"
                        searchPlaceholder="Rechercher une classe..."
                        options={classrooms.map((classroom) => ({
                            value: classroom.id,
                            label: classroom.name,
                        }))}
                    />
                </Field>
                <Field id="bulk-kind" label="Type" required>
                    <Select
                        value={bulkKind}
                        onValueChange={(value) =>
                            setBulkKind(value as IssuableKind)
                        }
                    >
                        <SelectTrigger id="bulk-kind">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ISSUABLE_KINDS.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {KIND_LABEL[value]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <p className="text-muted-foreground text-[13px]">
                    Année : {academicYearLabel}
                    {bulkClassroomId !== ''
                        ? ` · ${bulkCount} élève(s)`
                        : ''}
                </p>
            </FormSheet>
        </>
    );
}

DocumentsIndexPage.layout = {
    breadcrumbs: [{ title: 'Documents', href: documentsHub() }],
};
