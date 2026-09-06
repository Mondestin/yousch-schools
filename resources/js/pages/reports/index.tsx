import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    Download,
    EllipsisVertical,
    FileText,
    Layers,
    PenLine,
    Printer,
    School,
    User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { ListPage } from '@/components/sms/list-page';
import { PersonCell } from '@/components/sms/person-cell';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchSelect } from '@/components/sms/search-select';
import { CycleBadge } from '@/components/sms/code-badge';
import { useClientTable } from '@/hooks/use-client-table';
import { Badge } from '@/components/ui/badge';
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
import { apiData } from '@/lib/api';
import {
    downloadBulletinPdf,
    printBulletinDocument,
    type BulletinApiFiche,
} from '@/lib/school-bulletin-pdf';
import { defaultTermId } from '@/lib/school-grades';
import { cycleLabel, studentRows } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { bulletin as studentBulletin } from '@/routes/api/v1/students';
import { index as reports, show } from '@/routes/reports';
import { grades } from '@/routes/students';
import type { SchoolDataset } from '@/types/school';

export default function ReportsIndex({ catalog }: { catalog: SchoolDataset }) {
    const { filter, query, academicYearLabel } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [classroomId, setClassroomId] = useState('all');
    const [termId, setTermId] = useState(() => defaultTermId(catalog, filter));
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const terms = catalog.terms.filter(
        (term) => term.academicYearId === filter.academicYearId,
    );
    const currentTerm =
        terms.find((term) => term.id === termId) ?? terms[0] ?? null;

    useEffect(() => {
        setClassroomId('all');
        setTermId(defaultTermId(catalog, filter));
    }, [catalog, filter]);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return studentRows(catalog, filter).filter((row) => {
            if (classroomId !== 'all' && row.classroomId !== classroomId) {
                return false;
            }

            if (needle === '') {
                return true;
            }

            return `${row.name} ${row.matricule} ${row.classroom}`
                .toLowerCase()
                .includes(needle);
        });
    }, [catalog, classroomId, filter, search]);
    const table = useClientTable(rows);

    function openBulletin(studentId: string): void {
        router.visit(
            show(studentId, {
                query: { ...query, trimestre: termId },
            }),
        );
    }

    async function fetchBulletin(studentId: string): Promise<BulletinApiFiche> {
        return apiData<BulletinApiFiche>(
            studentBulletin.url(studentId, {
                query: { termId },
            }),
        );
    }

    async function downloadBulletin(
        studentId: string,
        name: string,
    ): Promise<void> {
        try {
            const fiche = await fetchBulletin(studentId);
            const slug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/gi, '');
            downloadBulletinPdf(fiche, `bulletin-${slug || studentId}.pdf`);
            toastSaved('Bulletin PDF téléchargé');
        } catch (error) {
            toastApiError(error, 'Impossible de télécharger le bulletin');
        }
    }

    async function printBulletin(
        studentId: string,
        name: string,
    ): Promise<void> {
        try {
            const fiche = await fetchBulletin(studentId);
            printBulletinDocument(`Bulletin : ${name}`, fiche);
        } catch (error) {
            toastApiError(error, 'Impossible d’imprimer le bulletin');
        }
    }

    return (
        <>
            <Head title="Bulletins" />
            <ListPage
                title="Bulletins"
                icon={FileText}
                description={`${cycleLabel(filter.cycle)} · ${academicYearLabel}${
                    currentTerm ? ` · ${currentTerm.name}` : ''
                }.`}
                searchPlaceholder="Rechercher un élève..."
                search={search}
                onSearchChange={setSearch}
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
                                {
                                    value: 'all',
                                    label: 'Toutes les classes',
                                },
                                ...classrooms.map((classroom) => ({
                                    value: classroom.id,
                                    label: classroom.name,
                                })),
                            ]}
                        />
                        <Select value={termId} onValueChange={setTermId}>
                            <SelectTrigger
                                className="w-[13rem]"
                                aria-label="Trimestre"
                            >
                                <SelectValue placeholder="Trimestre" />
                            </SelectTrigger>
                            <SelectContent>
                                {terms.map((term) => (
                                    <SelectItem key={term.id} value={term.id}>
                                        {term.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                }
                empty={{
                    title:
                        search.trim() || classroomId !== 'all'
                            ? 'Aucun résultat'
                            : 'Aucun bulletin dans ce cycle',
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
                                <DataTableColumnHeader icon={User}>
                                    Élève
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Layers}>
                                    Cycle
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Trimestre
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={FileText}>
                                    Bulletin
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
                                        href={show(row.studentId, {
                                            query: {
                                                ...query,
                                                trimestre: termId,
                                            },
                                        })}
                                        className="hover:text-primary"
                                    >
                                        <PersonCell
                                            name={row.name}
                                            hint={row.matricule}
                                        />
                                    </Link>
                                </TableCell>
                                <TableCell>{row.classroom}</TableCell>
                                <TableCell>
                                    <CycleBadge cycle={row.cycle} />
                                </TableCell>
                                <TableCell>
                                    {currentTerm?.name ?? '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="success">Disponible</Badge>
                                </TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={[
                                            {
                                                label: 'Ouvrir le bulletin',
                                                icon: FileText,
                                                onSelect: () =>
                                                    openBulletin(row.studentId),
                                            },
                                            {
                                                label: 'Modifier les notes',
                                                icon: PenLine,
                                                onSelect: () =>
                                                    router.visit(
                                                        grades(row.studentId, {
                                                            query,
                                                        }),
                                                    ),
                                            },
                                            {
                                                label: 'Télécharger le PDF',
                                                icon: Download,
                                                onSelect: () => {
                                                    void downloadBulletin(
                                                        row.studentId,
                                                        row.name,
                                                    );
                                                },
                                            },
                                            {
                                                label: 'Imprimer',
                                                icon: Printer,
                                                onSelect: () => {
                                                    void printBulletin(
                                                        row.studentId,
                                                        row.name,
                                                    );
                                                },
                                            },
                                        ]}
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

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Bulletins', href: reports() }],
};
