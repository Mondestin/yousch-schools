import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Briefcase,
    CalendarCheck,
    Layers,
    School,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CycleBadge, TrackBadge } from '@/components/sms/code-badge';
import {
    CHART_AXIS,
    ChartLegendItem,
    ChartTooltipContent,
} from '@/components/sms/chart-card';
import { DetailSectionCard } from '@/components/sms/person-profile-header';
import { EmptyState } from '@/components/sms/empty-state';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
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
import { cycleLabel, formatFrDate } from '@/lib/school-rows';
import {
    teacherAttendanceSummary,
    teacherFiche,
    teacherStatusLabel,
} from '@/lib/school-staff';
import { assignments as teacherAssignments } from '@/routes/teachers';
import type { SchoolDataset } from '@/types/school';

export default function TeacherOverviewPage({
    catalog,
    teacherId,
}: {
    catalog: SchoolDataset;
    teacherId: string;
}) {
    const { filter, query, academicYearLabel } = useSchoolContext();
    const fiche = teacherFiche(catalog, teacherId, filter.academicYearId);

    if (!fiche) {
        return null;
    }

    const attendance = teacherAttendanceSummary(catalog, teacherId);
    const fortnightMarks = attendance.fortnight.reduce(
        (sum, day) => sum + day.total,
        0,
    );
    const classrooms = new Set(
        fiche.assignments.map((item) => item.classroomId),
    ).size;
    const subjects = new Set(
        fiche.assignments.map((item) => item.subjectId),
    ).size;
    const cycles = [
        ...new Set(
            fiche.assignments
                .map((item) => item.cycleName)
                .filter((name) => name !== '-'),
        ),
    ];

    return (
        <>
            <Head title={`${fiche.name} : Synthèse`} />
            <div className="space-y-4">
                <KpiGrid className="gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        icon={Briefcase}
                        label="Affectations"
                        value={String(fiche.assignments.length)}
                        hint={`${academicYearLabel}`}
                    />
                    <KpiCard
                        icon={School}
                        label="Classes"
                        value={String(classrooms)}
                        hint={
                            cycles.length > 0
                                ? cycles.join(' · ')
                                : cycleLabel(filter.cycle)
                        }
                    />
                    <KpiCard
                        icon={BookOpen}
                        label="Matières"
                        value={String(subjects)}
                        hint={`${academicYearLabel}`}
                    />
                    <KpiCard
                        icon={CalendarCheck}
                        label="Assiduité"
                        value={
                            attendance.rate === null
                                ? '-'
                                : `${attendance.rate} %`
                        }
                        hint={`${attendance.present} présent${attendance.present === 1 ? '' : 's'} · ${attendance.absent} absence${attendance.absent === 1 ? '' : 's'}`}
                    />
                </KpiGrid>

                <div className="grid gap-4 xl:grid-cols-2">
                    <DetailSectionCard
                        title="Présences récentes"
                        description="Appels des 14 derniers jours."
                    >
                        <div className="space-y-3">
                            <div
                                className="h-[220px]"
                                role="img"
                                aria-label={
                                    fortnightMarks === 0
                                        ? 'Aucun appel sur les 14 derniers jours'
                                        : attendance.fortnight
                                              .filter((day) => day.total > 0)
                                              .map(
                                                  (day) =>
                                                      `${day.label} : ${day.present} présent${day.present === 1 ? '' : 's'}, ${day.absent} absent${day.absent === 1 ? '' : 's'}`,
                                              )
                                              .join('. ')
                                }
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={attendance.fortnight}
                                        margin={{
                                            top: 4,
                                            right: 4,
                                            bottom: 0,
                                            left: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            vertical={false}
                                            stroke="var(--border)"
                                        />
                                        <XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                ...CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            interval={0}
                                            angle={-40}
                                            textAnchor="end"
                                            height={52}
                                            minTickGap={0}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tickLine={false}
                                            axisLine={false}
                                            width={28}
                                            tick={CHART_AXIS}
                                            domain={[0, 'dataMax']}
                                        />
                                        <Tooltip
                                            cursor={{
                                                fill: 'var(--muted)',
                                            }}
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value) =>
                                                        `${value}`
                                                    }
                                                />
                                            }
                                        />
                                        <Bar
                                            dataKey="present"
                                            name="Présent"
                                            stackId="attendance"
                                            fill="var(--success)"
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="retard"
                                            name="Retard"
                                            stackId="attendance"
                                            fill="var(--brand-secondary)"
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="excuse"
                                            name="Excusé"
                                            stackId="attendance"
                                            fill="var(--event-blue)"
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="absent"
                                            name="Absent"
                                            stackId="attendance"
                                            fill="var(--danger)"
                                            radius={[4, 4, 0, 0]}
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
                                <ChartLegendItem color="var(--success)">
                                    Présent
                                </ChartLegendItem>
                                <ChartLegendItem color="var(--brand-secondary)">
                                    Retard
                                </ChartLegendItem>
                                <ChartLegendItem color="var(--event-blue)">
                                    Excusé
                                </ChartLegendItem>
                                <ChartLegendItem color="var(--danger)">
                                    Absent
                                </ChartLegendItem>
                                {fortnightMarks === 0 ? (
                                    <span className="ml-auto">
                                        Aucun appel sur cette période
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </DetailSectionCard>

                    <DetailSectionCard
                        title="Affectations de l’année"
                        description={`${academicYearLabel}.`}
                        action={
                            <Link
                                href={teacherAssignments(teacherId, { query })}
                                className="text-primary text-[12px] font-medium hover:underline"
                            >
                                Toutes les affectations
                            </Link>
                        }
                    >
                        {fiche.assignments.length === 0 ? (
                            <EmptyState
                                icon={Briefcase}
                                title="Aucune affectation"
                                description="Aucune classe ni matière pour cette année."
                            />
                        ) : (
                            <Table containerClassName="rounded-[8px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Classe</TableHead>
                                        <TableHead>Matière</TableHead>
                                        <TableHead>Cycle</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fiche.assignments
                                        .slice(0, 8)
                                        .map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    <span className="inline-flex flex-wrap items-center gap-1.5">
                                                        {item.classroom}
                                                        {item.trackCode ? (
                                                            <TrackBadge
                                                                code={
                                                                    item.trackCode
                                                                }
                                                            />
                                                        ) : null}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="code">
                                                        {item.subjectCode}
                                                    </Badge>{' '}
                                                    {item.subject}
                                                </TableCell>
                                                <TableCell>
                                                    {item.cycle ? (
                                                        <CycleBadge
                                                            cycle={item.cycle}
                                                        />
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        )}
                    </DetailSectionCard>
                </div>
            </div>
        </>
    );
}
