import { Head, Link, router } from '@inertiajs/react';
import {
    CircleDot,
    EllipsisVertical,
    GraduationCap,
    Hash,
    Layers,
    Plus,
    School,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CodeBadge, TrackBadge } from '@/components/sms/code-badge';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PersonCell } from '@/components/sms/person-cell';
import { SearchSelect } from '@/components/sms/search-select';
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
    const [removed, setRemoved] = useState<string[]>([]);
    const lycee = isLyceeCycle(filter.cycle);
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return studentRows(catalog, filter).filter((row) => {
            if (removed.includes(row.id)) {
                return false;
            }

            if (classroomId !== 'all' && row.classroomId !== classroomId) {
                return false;
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
    }, [catalog, classroomId, filter, removed, search]);
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
                filters={
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
                        search.trim() || classroomId !== 'all'
                            ? 'Aucun résultat'
                            : 'Aucun élève dans ce cycle',
                    description:
                        search.trim() || classroomId !== 'all'
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
