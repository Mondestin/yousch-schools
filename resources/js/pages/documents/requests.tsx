import { Head, router } from '@inertiajs/react';
import {
    Check,
    FileBadge2,
    Inbox,
    ShieldX,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { apiData } from '@/lib/api';
import { formatFrDate } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import {
    index as documentsHub,
    requests as documentsRequests,
} from '@/routes/documents';
import { documents as studentDocuments } from '@/routes/students';
import type {
    DocumentRequest,
    IssuedDocument,
    SchoolDataset,
} from '@/types/school';

type ApproveResult = {
    request: DocumentRequest;
    document: IssuedDocument;
};

export default function DocumentRequestsPage({
    documentRequests,
}: {
    catalog: SchoolDataset;
    documentRequests: DocumentRequest[];
}) {
    const [items, setItems] = useState(documentRequests);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<
        'all' | 'pending' | 'approved' | 'rejected'
    >('pending');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejecting, setRejecting] = useState<DocumentRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectSaving, setRejectSaving] = useState(false);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return items.filter((item) => {
            if (status !== 'all' && item.status !== status) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return `${item.kindLabel} ${item.studentName ?? ''} ${item.studentMatricule ?? ''} ${item.requesterName ?? ''} ${item.note ?? ''}`
                .toLowerCase()
                .includes(needle);
        });
    }, [items, search, status]);

    const table = useClientTable(rows);

    async function approve(item: DocumentRequest): Promise<void> {
        setBusyId(item.id);

        try {
            const result = await apiData<ApproveResult>(
                `/api/v1/document-requests/${item.id}/approve`,
                { method: 'POST' },
            );
            setItems((current) =>
                current.map((row) =>
                    row.id === item.id ? result.request : row,
                ),
            );
            toastSaved('Demande approuvée · document émis');
        } catch (error) {
            toastApiError(error);
        } finally {
            setBusyId(null);
        }
    }

    async function reject(): Promise<void> {
        if (rejecting === null) {
            return;
        }

        setRejectSaving(true);

        try {
            const updated = await apiData<DocumentRequest>(
                `/api/v1/document-requests/${rejecting.id}/reject`,
                {
                    method: 'POST',
                    body: {
                        reason: rejectReason.trim() || null,
                    },
                },
            );
            setItems((current) =>
                current.map((row) =>
                    row.id === rejecting.id ? updated : row,
                ),
            );
            setRejectOpen(false);
            setRejecting(null);
            setRejectReason('');
            toastSaved('Demande refusée');
        } catch (error) {
            toastApiError(error);
        } finally {
            setRejectSaving(false);
        }
    }

    return (
        <>
            <Head title="Demandes de documents" />
            <ListPage
                embedded
                title="Demandes"
                description="Demandes à approuver ou déjà traitées."
                icon={Inbox}
                searchPlaceholder="Élève, type, demandeur..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <Select
                        value={status}
                        onValueChange={(value) =>
                            setStatus(
                                value as
                                    | 'all'
                                    | 'pending'
                                    | 'approved'
                                    | 'rejected',
                            )
                        }
                    >
                        <SelectTrigger className="w-[10rem]">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="approved">Approuvées</SelectItem>
                            <SelectItem value="rejected">Refusées</SelectItem>
                            <SelectItem value="all">Toutes</SelectItem>
                        </SelectContent>
                    </Select>
                }
                empty={{
                    title:
                        status === 'pending'
                            ? 'Aucune demande en attente'
                            : 'Aucune demande',
                    description:
                        status === 'pending'
                            ? 'Les demandes déposées depuis une fiche élève apparaîtront ici.'
                            : undefined,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={UserRound}>
                                    Élève
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={FileBadge2}>
                                    Document
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>Demandé le</TableHead>
                            <TableHead>Par</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px] font-medium">
                                            {item.studentName ?? '-'}
                                        </p>
                                        <p className="text-muted-foreground font-mono text-[12px]">
                                            {item.studentMatricule ?? ''}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px]">
                                            {item.kindLabel}
                                        </p>
                                        {item.note ? (
                                            <p className="text-muted-foreground text-[12px]">
                                                {item.note}
                                            </p>
                                        ) : null}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.createdAt
                                        ? formatFrDate(
                                              item.createdAt.slice(0, 10),
                                          )
                                        : '-'}
                                </TableCell>
                                <TableCell className="text-[13px]">
                                    {item.requesterName ?? '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            item.status === 'pending'
                                                ? 'warning'
                                                : item.status === 'approved'
                                                  ? 'success'
                                                  : 'danger'
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
                                            ...(item.status === 'pending'
                                                ? [
                                                      {
                                                          label: 'Approuver et émettre',
                                                          icon: Check,
                                                          disabled:
                                                              busyId ===
                                                              item.id,
                                                          onSelect: () => {
                                                              void approve(
                                                                  item,
                                                              );
                                                          },
                                                      },
                                                      {
                                                          label: 'Refuser',
                                                          icon: ShieldX,
                                                          destructive: true,
                                                          onSelect: () => {
                                                              setRejecting(
                                                                  item,
                                                              );
                                                              setRejectReason(
                                                                  '',
                                                              );
                                                              setRejectOpen(
                                                                  true,
                                                              );
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
                open={rejectOpen}
                onOpenChange={(open) => {
                    setRejectOpen(open);
                    if (!open) {
                        setRejecting(null);
                        setRejectReason('');
                    }
                }}
                title="Refuser la demande"
                description={
                    rejecting
                        ? `${rejecting.kindLabel} · ${rejecting.studentName ?? 'élève'}`
                        : undefined
                }
                submitLabel="Refuser"
                submitting={rejectSaving}
                onSubmit={() => {
                    void reject();
                }}
            >
                <Field id="reject-reason" label="Motif (optionnel)">
                    <Input
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(event) =>
                            setRejectReason(event.target.value)
                        }
                        placeholder="Ex. pièce manquante, dossier incomplet…"
                    />
                </Field>
            </FormSheet>
        </>
    );
}

DocumentRequestsPage.layout = {
    breadcrumbs: [
        { title: 'Documents', href: documentsHub() },
        { title: 'Demandes', href: documentsRequests() },
    ],
};
