import { Head, Link } from '@inertiajs/react';
import { EllipsisVertical, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTableColumnHeader } from '@/components/sms/data-table';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { RowMenu } from '@/components/sms/row-menu';
import { Badge } from '@/components/ui/badge';
import { PersonCell } from '@/components/sms/person-cell';
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
import { useSchoolContext } from '@/hooks/use-school-context';
import { crudItems } from '@/lib/school-crud';
import { personName } from '@/lib/school-rows';
import {
    GUARDIAN_RELATIONS,
    guardianRelationLabel,
    studentFiche,
} from '@/lib/school-students';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiJson } from '@/lib/api';
import { attachStudent, detachStudent } from '@/routes/api/v1/guardians';
import { show as showGuardian } from '@/routes/guardians';
import { index as students } from '@/routes/students';
import type {
    Guardian,
    GuardianRelation,
    SchoolDataset,
    StudentGuardian,
} from '@/types/school';

type GuardianRow = Guardian & {
    name: string;
    relation: GuardianRelation;
};

export default function StudentGuardiansPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter, query } = useSchoolContext();
    const [links, setLinks] = useState<StudentGuardian[]>(() =>
        catalog.studentGuardians.filter((link) => link.studentId === studentId),
    );
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<GuardianRow | null>(null);
    const [relation, setRelation] = useState<GuardianRelation>('pere');
    const [saving, setSaving] = useState(false);
    const rows = useMemo(
        () =>
            links
                .map((link) => {
                    const guardian = catalog.guardians.find(
                        (item) => item.id === link.guardianId,
                    );

                    if (!guardian) {
                        return null;
                    }

                    return {
                        ...guardian,
                        name: personName(guardian),
                        relation: link.relation,
                    };
                })
                .filter((item) => item !== null),
        [catalog.guardians, links],
    );
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);

    if (!fiche) {
        return null;
    }

    function openEdit(guardian: GuardianRow): void {
        setEditingId(guardian.id);
        setRelation(guardian.relation);
        setOpen(true);
    }

    async function detach(guardianId: string): Promise<void> {
        try {
            await apiJson(
                detachStudent.url({ guardian: guardianId, student: studentId }),
                { method: 'DELETE' },
            );
            setLinks((current) =>
                current.filter((link) => link.guardianId !== guardianId),
            );
            toastRemoved('Tuteur retiré');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!editingId) {
            return;
        }

        setSaving(true);

        try {
            await apiJson(attachStudent.url(editingId), {
                method: 'POST',
                body: { studentId, relation },
            });
            setLinks((current) =>
                current.map((link) =>
                    link.guardianId === editingId
                        ? { ...link, relation }
                        : link,
                ),
            );
            setOpen(false);
            toastSaved('Lien mis à jour');
        } catch (error) {
            toastApiError(error instanceof ApiError ? error : error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title={`${fiche.name} : Tuteurs`} />
            <h2 className="mb-4 text-[15px] font-semibold">Tuteurs</h2>
            <div className="overflow-hidden rounded-[8px] border">
                {rows.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Aucun tuteur"
                        description="Aucun tuteur n’est encore lié à cet élève."
                    />
                ) : (
                    <Table containerClassName="rounded-none border-0">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Nom</TableHead>
                                <TableHead>Téléphone</TableHead>
                                <TableHead>Profession</TableHead>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Lien</TableHead>
                                <TableHead className="w-14 text-center">
                                    <DataTableColumnHeader
                                        icon={EllipsisVertical}
                                    >
                                        Actions
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((guardian) => (
                                <TableRow key={guardian.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={showGuardian(guardian.id, {
                                                query,
                                            })}
                                            className="hover:text-primary"
                                        >
                                            <PersonCell name={guardian.name} />
                                        </Link>
                                    </TableCell>
                                    <TableCell>{guardian.phone}</TableCell>
                                    <TableCell>{guardian.profession}</TableCell>
                                    <TableCell>
                                        {guardian.email ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="muted">
                                            {guardianRelationLabel(
                                                guardian.relation,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onView: () =>
                                                    setViewing(guardian),
                                                onEdit: () =>
                                                    openEdit(guardian),
                                                onDelete: () =>
                                                    detach(guardian.id),
                                                confirm: {
                                                    title: 'Retirer le tuteur ?',
                                                    description: `${guardian.name} ne sera plus rattaché à ${fiche.name}. Sa fiche tuteur reste disponible.`,
                                                    confirmLabel: 'Retirer',
                                                },
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                icon={Users}
                title={viewing?.name ?? 'Tuteur'}
                description={
                    viewing
                        ? `${guardianRelationLabel(viewing.relation)} de ${fiche.name}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              { label: 'Téléphone', value: viewing.phone },
                              {
                                  label: 'Profession',
                                  value: viewing.profession,
                              },
                              { label: 'E-mail', value: viewing.email ?? '-' },
                              { label: 'Ville', value: viewing.city ?? '-' },
                              {
                                  label: 'Quartier',
                                  value: viewing.neighborhood ?? '-',
                              },
                              {
                                  label: 'Adresse',
                                  value: viewing.address ?? '-',
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title="Modifier le lien"
                description="Le lien de parenté ne concerne que cet élève. L’identité du tuteur se modifie sur sa fiche."
                submitLabel="Enregistrer"
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field id="relation" label="Lien" required>
                    <Select
                        value={relation}
                        onValueChange={(value) =>
                            setRelation(value as GuardianRelation)
                        }
                    >
                        <SelectTrigger id="relation" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {GUARDIAN_RELATIONS.map((item) => (
                                <SelectItem key={item} value={item}>
                                    {guardianRelationLabel(item)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FormSheet>
        </>
    );
}

StudentGuardiansPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Fiche', href: students() },
    ],
};
