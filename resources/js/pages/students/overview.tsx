import { Head, Link } from '@inertiajs/react';
import {
    CalendarCheck,
    ClipboardList,
    ShieldAlert,
    Wallet,
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
import { formatNote } from '@/lib/school-grades';
import {
    academicYearMonths,
    expectedFee,
    paymentStatusFromAmount,
} from '@/lib/school-payments';
import { formatFcfa } from '@/lib/school-rows';
import {
    assessmentTypeLabel,
    studentAttendanceSummary,
    studentAverageScore,
    studentFiche,
} from '@/lib/school-students';
import { grades as studentGrades } from '@/routes/students';
import type { SchoolDataset } from '@/types/school';

export default function StudentOverviewPage({
    catalog,
    studentId,
}: {
    catalog: SchoolDataset;
    studentId: string;
}) {
    const { filter, query } = useSchoolContext();
    const fiche = studentFiche(catalog, studentId, filter.academicYearId);

    if (!fiche) {
        return null;
    }

    const attendance = studentAttendanceSummary(
        catalog,
        fiche.enrollment?.id,
    );
    const average = studentAverageScore(fiche.grades);
    const monthly = fiche.cycle ? expectedFee(catalog, fiche.cycle) : 0;
    const months = fiche.year ? academicYearMonths(fiche.year) : [];
    const paymentRows = months.map((month) => {
        const payment = fiche.payments.find((item) => item.month === month);
        const amount = payment?.amount ?? 0;
        const expectedAmount = payment?.expectedAmount ?? monthly;
        const status = payment
            ? payment.status
            : paymentStatusFromAmount(0, expectedAmount);

        return { month, amount, expectedAmount, status };
    });
    const unpaid = paymentRows.filter((row) => row.status !== 'paye').length;
    const paidAmount = paymentRows.reduce((sum, row) => sum + row.amount, 0);
    const recentGrades = [...fiche.grades]
        .sort((left, right) => right.heldOn.localeCompare(left.heldOn))
        .slice(0, 6);
    const fortnightMarks = attendance.fortnight.reduce(
        (sum, day) => sum + day.total,
        0,
    );

    return (
        <>
            <Head title={`${fiche.name} : Synthèse`} />
            <div className="space-y-4">
                <KpiGrid className="gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        icon={ClipboardList}
                        label="Moyenne"
                        value={
                            average === null ? '-' : `${formatNote(average)} / 20`
                        }
                        hint={`${fiche.grades.length} note${fiche.grades.length === 1 ? '' : 's'}`}
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
                    <KpiCard
                        icon={Wallet}
                        label="Paiements"
                        value={formatFcfa(paidAmount)}
                        hint={
                            unpaid === 0
                                ? 'À jour'
                                : `${unpaid} mois en retard`
                        }
                    />
                    <KpiCard
                        icon={ShieldAlert}
                        label="Discipline"
                        value={String(fiche.sanctions.length)}
                        hint={`${fiche.guardians.length} tuteur${fiche.guardians.length === 1 ? '' : 's'}`}
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
                        title="Dernières notes"
                        description="Évaluations les plus récentes."
                        action={
                            <Link
                                href={studentGrades(studentId, { query })}
                                className="text-primary text-[12px] font-medium hover:underline"
                            >
                                Toutes les notes
                            </Link>
                        }
                    >
                        {recentGrades.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="Aucune note"
                                description="Aucune note n’est encore saisie pour cette année."
                            />
                        ) : (
                            <Table containerClassName="rounded-[8px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Matière</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Note</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentGrades.map((grade) => (
                                        <TableRow key={grade.id}>
                                            <TableCell className="font-medium">
                                                {grade.subject}
                                            </TableCell>
                                            <TableCell>
                                                {assessmentTypeLabel(
                                                    grade.type,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="code">
                                                    {grade.score}/20
                                                </Badge>
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
