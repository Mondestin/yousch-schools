import { Head, Link, router } from '@inertiajs/react';
import {
    CircleDot,
    EllipsisVertical,
    FolderOpen,
    GraduationCap,
    Hash,
    Layers,
    Plus,
    School,
    User,
    UserCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CodeBadge, TrackBadge } from '@/components/sms/code-badge';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PersonCell } from '@/components/sms/person-cell';
import { SearchSelect } from '@/components/sms/search-select';
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
import { useCrudItems } from '@/hooks/use-crud-items';
import { apiJson } from '@/lib/api';
import { evaluateDossier } from '@/lib/school-dossier';
import { dossierFilesOf } from '@/lib/school-files';
import {
    cycleLabel,
    enrollmentStatusLabel,
    enrollmentStatusVariant,
    isLyceeCycle,
    studentRows,
} from '@/lib/school-rows';
import { toastApiError, toastRemoved } from '@/lib/school-toast';
import { destroy as destroyEnrollment } from '@/routes/api/v1/enrollments';
import { create, index as students, show } from '@/routes/students';
import type { SchoolDataset } from '@/types/school';

export default function StudentsIndex({ catalog }: { catalog: SchoolDataset }) {
    const crudItems = useCrudItems();

    const { filter, query, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [classroomId, setClassroomId] = useState('all');
    const [dossierFilter, setDossierFilter] = useState<
        'all' | 'incomplete' | 'complete'
    >('all');
    const [removed, setRemoved] = useState<string[]>([]);
    const lycee = isLyceeCycle(filter.cycle);
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const studentsById = useMemo(
        () => new Map(catalog.students.map((student) => [student.id, student])),
        [catalog.students],
    );
    const scoped = useMemo(
        () =>
            studentRows(catalog, filter).filter(
                (row) => !removed.includes(row.id),
            ),
        [catalog, filter, removed],
    );
    const stats = useMemo(() => {
        const incomplete = scoped.filter((row) => {
            const student = studentsById.get(row.studentId);

            return !evaluateDossier(
                student?.photoUrl,
                dossierFilesOf(student),
            ).complete;
        }).length;

        return {
            total: scoped.length,
            enrolled: scoped.filter((row) => row.status === 'inscrit').length,
            transferred: scoped.filter((row) => row.status === 'transfere')
                .length,
            dropped: scoped.filter((row) => row.status === 'abandonne').length,
            classrooms: classrooms.length,
            incomplete,
        };
    }, [classrooms.length, scoped, studentsById]);
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return scoped.filter((row) => {
            if (classroomId !== 'all' && row.classroomId !== classroomId) {
                return false;
            }

            if (dossierFilter !== 'all') {
                const student = studentsById.get(row.studentId);
                const complete = evaluateDossier(
                    student?.photoUrl,
                    dossierFilesOf(student),
                ).complete;

                if (dossierFilter === 'incomplete' && complete) {
                    return false;
                }

                if (dossierFilter === 'complete' && !complete) {
                    return false;
                }
            }

            if (needle === '') {
                return true;
            }

            return [
                row.matricule,
                row.lastName,
                row.firstName,
                row.classroom,
                row.track ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(needle);
        });
    }, [classroomId, dossierFilter, scoped, search, studentsById]);
    const table = useClientTable(rows);

    async function removeEnrollment(
        enrollmentId: string,
        name: string,
    ): Promise<void> {
        try {
            await apiJson(destroyEnrollment.url(enrollmentId), {
                method: 'DELETE',
            });
            setRemoved((current) => [...current, enrollmentId]);
            toastRemoved(`${name} : inscription retirée`);
        } catch (error) {
            toastApiError(error, 'Impossible de retirer l’inscription');
        }
    }

    return (
        <>
            <Head title="Élèves" />
            <ListPage
                embedded
                title="Élèves"
                icon={GraduationCap}
                description={`Inscriptions ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                searchPlaceholder="Rechercher nom, matricule, classe..."
                search={search}
                onSearchChange={setSearch}
                stats={
                    <KpiGrid>
                        <KpiCard
                            icon={GraduationCap}
                            label="Inscriptions"
                            value={String(stats.total)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                        <KpiCard
                            icon={UserCheck}
                            label="Inscrits"
                            value={String(stats.enrolled)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                        <KpiCard
                            icon={Layers}
                            label="Classes"
                            value={String(stats.classrooms)}
                            hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                        />
                        <KpiCard
                            icon={FolderOpen}
                            label="Dossiers incomplets"
                            value={String(stats.incomplete)}
                            hint="Pièces manquantes"
                        />
                    </KpiGrid>
                }
                filters={
                    <>
                        <SearchSelect
                            value={classroomId}
                            onValueChange={setClassroomId}
                            className="w-[11rem]"
                            aria-label="Filtrer par classe"
                            placeholder="Toutes les classes"
                            searchPlaceholder="Rechercher une classe..."
                            options={[
                                { value: 'all', label: 'Toutes les classes' },
                                ...classrooms.map((classroom) => ({
                                    value: classroom.id,
                                    label: classroom.name,
                                })),
                            ]}
                        />
                        <Select
                            value={dossierFilter}
                            onValueChange={(value) =>
                                setDossierFilter(
                                    value as 'all' | 'incomplete' | 'complete',
                                )
                            }
                        >
                            <SelectTrigger
                                className="w-[12rem]"
                                aria-label="Filtrer par dossier"
                            >
                                <SelectValue placeholder="Tous les dossiers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Tous les dossiers
                                </SelectItem>
                                <SelectItem value="incomplete">
                                    Dossiers incomplets
                                </SelectItem>
                                <SelectItem value="complete">
                                    Dossiers complets
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
                actions={
                    <Button type="button" size="sm" asChild>
                        <Link href={create({ query })}>
                            <Plus />
                            Ajouter
                        </Link>
                    </Button>
                }
                empty={{
                    title:
                        search.trim() ||
                        classroomId !== 'all' ||
                        dossierFilter !== 'all'
                            ? 'Aucun résultat'
                            : 'Aucun élève dans ce cycle',
                    description:
                        search.trim() ||
                        classroomId !== 'all' ||
                        dossierFilter !== 'all'
                            ? undefined
                            : `Aucune inscription en ${cycleLabel(filter.cycle)} pour ${academicYearLabel}.`,
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    Matricule
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Nom
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Prénom
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
                                </DataTableColumnHeader>
                            </TableHead>
                            {lycee ? (
                                <TableHead>
                                    <DataTableColumnHeader icon={Layers}>
                                        Série
                                    </DataTableColumnHeader>
                                </TableHead>
                            ) : null}
                            <TableHead>
                                <DataTableColumnHeader icon={CircleDot}>
                                    Statut
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={FolderOpen}>
                                    Dossier
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead className="w-14 text-center">
                                <DataTableColumnHeader icon={EllipsisVertical}>
                                    Actions
                                </DataTableColumnHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Link
                                        href={show(row.studentId, { query })}
                                        className="hover:text-primary"
                                    >
                                        <CodeBadge>{row.matricule}</CodeBadge>
                                    </Link>
                                </TableCell>
                                <TableCell className="font-medium">
                                    <PersonCell
                                        name={row.name}
                                        label={row.lastName}
                                        photoUrl={row.photoUrl}
                                    />
                                </TableCell>
                                <TableCell>{row.firstName}</TableCell>
                                <TableCell>{row.classroom}</TableCell>
                                {lycee ? (
                                    <TableCell>
                                        <TrackBadge code={row.track} />
                                    </TableCell>
                                ) : null}
                                <TableCell>
                                    <Badge
                                        variant={enrollmentStatusVariant(
                                            row.status,
                                        )}
                                    >
                                        {enrollmentStatusLabel(row.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const student = studentsById.get(
                                            row.studentId,
                                        );
                                        const dossier = evaluateDossier(
                                            student?.photoUrl,
                                            dossierFilesOf(student),
                                        );

                                        return (
                                            <Badge
                                                variant={
                                                    dossier.complete
                                                        ? 'success'
                                                        : 'warning'
                                                }
                                            >
                                                {dossier.complete
                                                    ? 'Complet'
                                                    : `${dossier.missing.length} manq.`}
                                            </Badge>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: () => {
                                                router.visit(
                                                    show(row.studentId, {
                                                        query,
                                                    }),
                                                );
                                            },
                                            onEdit: () => {
                                                router.visit(
                                                    show(row.studentId, {
                                                        query,
                                                    }),
                                                );
                                            },
                                            onDelete: () => {
                                                void removeEnrollment(
                                                    row.id,
                                                    row.name,
                                                );
                                            },
                                            confirm: {
                                                title: 'Retirer l’inscription ?',
                                                description: `${row.name} ne figurera plus dans les effectifs de ${row.classroom}.`,
                                                confirmLabel: 'Retirer',
                                            },
                                        })}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>
        </>
    );
}

StudentsIndex.layout = {
    breadcrumbs: [{ title: 'Élèves', href: students() }],
};
