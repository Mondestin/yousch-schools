import { Head, Link } from '@inertiajs/react';
import { CircleDot, Hash, Printer, Trophy, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTable,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { EmptyState } from '@/components/sms/empty-state';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
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
import { cycleLabel } from '@/lib/school-rows';
import { show as showReport } from '@/routes/reports';
import { index as results } from '@/routes/results';
import type { SchoolDataset } from '@/types/school';

export default function ResultsIndex({ catalog }: { catalog: SchoolDataset }) {
    const { filter, query, academicYearLabel } = useSchoolContext();
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
            <Head title="Résultats et bilans" />
            <PageShell flush className="overflow-hidden">
                <PageHeader
                    flush
                    title="Résultats et bilans"
                    description={`${cycleLabel(filter.cycle)} · ${academicYearLabel}. Classement de la classe, mentions et admis.`}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            className="no-print"
                            onClick={() => window.print()}
                        >
                            <Printer />
                            Imprimer
                        </Button>
                    }
                />
                {report && report.rows.length > 0 ? (
                    <div className="grid shrink-0 gap-3 px-6 pb-3 sm:grid-cols-3">
                        <Stat
                            label="Moyenne de classe"
                            value={
                                report.classAverage === null
                                    ? '—'
                                    : `${formatNote(report.classAverage)} / 20`
                            }
                        />
                        <Stat label="Admis" value={String(report.admitted)} />
                        <Stat label="Échoués" value={String(report.failed)} />
                    </div>
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
                                        <TableCell>{row.rank ?? '—'}</TableCell>
                                        <TableCell>{row.matricule}</TableCell>
                                        <TableCell>
                                            <Link
                                                href={showReport(
                                                    row.studentId,
                                                    {
                                                        query: {
                                                            ...query,
                                                            trimestre: termId,
                                                        },
                                                    },
                                                )}
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
                                                ? '—'
                                                : formatNote(row.average)}
                                        </TableCell>
                                        <TableCell>
                                            {row.mention ?? '—'}
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
                                                '—'
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : null}
                </DataTable>
            </PageShell>
        </>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[8px] border px-4 py-3">
            <p className="text-muted-foreground text-[12px]">{label}</p>
            <p className="text-[18px] font-semibold">{value}</p>
        </div>
    );
}

ResultsIndex.layout = {
    breadcrumbs: [{ title: 'Résultats', href: results() }],
};
