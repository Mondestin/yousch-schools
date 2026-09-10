import { Head, Link } from '@inertiajs/react';
import { CircleDot, Hash, Printer, Trophy, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTable,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { EmptyState } from '@/components/sms/empty-state';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { PageToolbar } from '@/components/sms/page-toolbar';
import { PersonCell } from '@/components/sms/person-cell';
import { SearchSelect } from '@/components/sms/search-select';
import { TablePagination } from '@/components/sms/table-pagination';
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
import { classResults, defaultTermId, formatNote } from '@/lib/school-grades';
import { classroomsForOffice } from '@/lib/school-office';
import { index as reports, show as showReport } from '@/routes/reports';
import { index as results } from '@/routes/results';
import type { SchoolDataset } from '@/types/school';

export default function ResultsIndex({ catalog }: { catalog: SchoolDataset }) {
    const { filter, query } = useSchoolContext();
    const classrooms = classroomsForOffice(catalog, filter);
    const terms = catalog.terms.filter(
        (term) => term.academicYearId === filter.academicYearId,
    );
    const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? '');
    const [termId, setTermId] = useState(defaultTermId(catalog, filter));
    const report = useMemo(
        () =>
            classroomId && termId
                ? classResults(catalog, classroomId, termId)
                : null,
        [catalog, classroomId, termId],
    );
    const rows = report?.rows ?? [];
    const table = useClientTable(rows);

    return (
        <>
            <Head title="Résultats" />
            {report && report.rows.length > 0 ? (
                <KpiGrid className="mx-6 mt-4 mb-3 gap-4 sm:grid-cols-3 xl:grid-cols-3">
                    <KpiCard
                        icon={Hash}
                        label="Moyenne de classe"
                        value={
                            report.classAverage === null
                                ? '-'
                                : `${formatNote(report.classAverage)} / 20`
                        }
                    />
                    <KpiCard
                        icon={Trophy}
                        label="Admis"
                        value={String(report.admitted)}
                    />
                    <KpiCard
                        icon={User}
                        label="Échoués"
                        value={String(report.failed)}
                    />
                </KpiGrid>
            ) : null}
            <DataTable
                className="min-h-0"
                toolbar={
                    <PageToolbar
                        className="no-print"
                        filters={
                            <>
                                <SearchSelect
                                    value={classroomId}
                                    onValueChange={setClassroomId}
                                    className="w-[220px]"
                                    aria-label="Classe"
                                    placeholder="Classe"
                                    searchPlaceholder="Rechercher une classe..."
                                    options={classrooms.map((item) => ({
                                        value: item.id,
                                        label: item.name,
                                    }))}
                                />
                                <Select
                                    value={termId}
                                    onValueChange={setTermId}
                                >
                                    <SelectTrigger
                                        className="w-[220px]"
                                        aria-label="Trimestre"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {terms.map((term) => (
                                            <SelectItem
                                                key={term.id}
                                                value={term.id}
                                            >
                                                {term.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        }
                        actions={
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.print()}
                            >
                                <Printer />
                                Imprimer
                            </Button>
                        }
                    />
                }
                empty={
                    rows.length === 0 ? (
                        <EmptyState
                            icon={Trophy}
                            title="Aucun résultat à afficher"
                            description="Il faut une classe, un trimestre, et des notes saisies."
                        />
                    ) : undefined
                }
                footer={
                    rows.length > 0 ? (
                        <TablePagination
                            from={table.from}
                            to={table.to}
                            total={table.total}
                            page={table.page}
                            lastPage={table.lastPage}
                            pageSize={table.pageSize}
                            onPageChange={table.setPage}
                            onPageSizeChange={table.setPageSize}
                        />
                    ) : undefined
                }
            >
                {rows.length > 0 ? (
                    <Table containerClassName={DATA_TABLE_CONTAINER}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <DataTableColumnHeader icon={Hash}>
                                        Rang
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Hash}>
                                        Matricule
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={User}>
                                        Élève
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Trophy}>
                                        Moyenne
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Trophy}>
                                        Mention
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={CircleDot}>
                                        Résultat
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.pageRows.map((row) => (
                                <TableRow key={row.studentId}>
                                    <TableCell>{row.rank ?? '-'}</TableCell>
                                    <TableCell>{row.matricule}</TableCell>
                                    <TableCell>
                                        <Link
                                            href={showReport(row.studentId, {
                                                query: {
                                                    ...query,
                                                    trimestre: termId,
                                                },
                                            })}
                                            className="hover:text-primary font-medium"
                                        >
                                            <PersonCell
                                                name={row.name}
                                                hint={row.matricule}
                                            />
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {row.average === null
                                            ? '-'
                                            : formatNote(row.average)}
                                    </TableCell>
                                    <TableCell>
                                        {row.mention ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                        {row.result ? (
                                            <Badge
                                                variant={
                                                    row.result === 'Admis'
                                                        ? 'success'
                                                        : 'danger'
                                                }
                                            >
                                                {row.result}
                                            </Badge>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : null}
            </DataTable>
        </>
    );
}

ResultsIndex.layout = {
    breadcrumbs: [
        { title: 'Bulletins', href: reports() },
        { title: 'Résultats', href: results() },
    ],
};
