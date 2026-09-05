import { Head } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/sms/empty-state';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useSchoolContext } from '@/hooks/use-school-context';
import { formatFrDate } from '@/lib/school-rows';
import { assessmentTypeLabel, studentFiche } from '@/lib/school-students';
import { index as students } from '@/routes/students';
import type { SchoolDataset } from '@/types/school';

export default function StudentGradesPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);

    if (!fiche) {
        return null;
    }

    return (
        <>
            <Head title={`${fiche.name} — Notes`} />
            <h2 className="mb-4 text-[15px] font-semibold">Notes /20</h2>
            <div className="overflow-hidden rounded-[8px] border">
                {fiche.grades.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title="Aucune note"
                        description="Aucune note n’est encore saisie pour cette année."
                    />
                ) : (
                    <Table containerClassName="rounded-none border-0">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Matière</TableHead>
                                <TableHead>Évaluation</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead>Mention</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fiche.grades.map((grade) => (
                                <TableRow key={grade.id}>
                                    <TableCell className="font-medium">
                                        {grade.subject}
                                    </TableCell>
                                    <TableCell>{grade.assessment}</TableCell>
                                    <TableCell>
                                        {assessmentTypeLabel(grade.type)}
                                    </TableCell>
                                    <TableCell>
                                        {grade.heldOn
                                            ? formatFrDate(grade.heldOn)
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="code">
                                            {grade.score}/20
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {grade.mention ?? '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </>
    );
}

StudentGradesPage.layout = {
    breadcrumbs: [
        { title: 'Élèves', href: students() },
        { title: 'Fiche', href: students() },
    ],
};
