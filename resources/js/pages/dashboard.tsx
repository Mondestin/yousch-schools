import { Head, Link } from '@inertiajs/react';
import {
    Briefcase,
    CalendarCheck,
    GraduationCap,
    LayoutGrid,
    PieChart as PieChartIcon,
    TrendingUp,
    UserCheck,
    Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    CHART_AXIS,
    ChartCard,
    ChartLegendItem,
    ChartTooltipContent,
} from '@/components/sms/chart-card';
import { KpiCard } from '@/components/sms/kpi-card';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { useSchoolContext } from '@/hooks/use-school-context';
import { useVisitPending } from '@/hooks/use-visit-pending';
import {
    attendanceDates,
    attendanceMix,
    attendanceTrend,
    collectionByCycle,
    collectionTotals,
    cycleShortLabel,
    headcountByCycle,
    occupancyByClassroom,
    CHART_COLORS,
} from '@/lib/school-analytics';
import {
    cycleLabel,
    dashboardSnapshot,
    formatFcfa,
    formatFrDate,
} from '@/lib/school-rows';
import { teacherRows } from '@/lib/school-staff';
import { index as attendance } from '@/routes/attendance';
import { dashboard } from '@/routes';
import { index as payments } from '@/routes/payments';
import { index as students } from '@/routes/students';
import { index as teachers } from '@/routes/teachers';
import type { SchoolDataset } from '@/types/school';
import { cn } from '@/lib/utils';

const compactFcfa = (value: number): string =>
    `${new Intl.NumberFormat('fr-FR', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value)}`;

export default function Dashboard({ catalog }: { catalog: SchoolDataset }) {
    const { filter, query, academicYearLabel, setContext } = useSchoolContext();
    const loading = useVisitPending();
    const snapshot = dashboardSnapshot(catalog, filter);

    const collection = useMemo(
        () => collectionByCycle(catalog, filter.academicYearId, snapshot.month),
        [catalog, filter.academicYearId, snapshot.month],
    );
    const totals = useMemo(() => collectionTotals(collection), [collection]);
    const headcount = useMemo(
        () => headcountByCycle(catalog, filter.academicYearId),
        [catalog, filter.academicYearId],
    );
    const occupancy = useMemo(
        () => occupancyByClassroom(catalog, filter.academicYearId),
        [catalog, filter.academicYearId],
    );
    const trend = useMemo(
        () => attendanceTrend(catalog, filter.academicYearId),
        [catalog, filter.academicYearId],
    );
    const lastRollCall = attendanceDates(catalog).at(-1) ?? '';
    const rollCall = useMemo(
        () => attendanceMix(catalog, filter.academicYearId, lastRollCall),
        [catalog, filter.academicYearId, lastRollCall],
    );
    const presenceRate = trend.at(-1)?.rate ?? 0;
    const activeTeachers = teacherRows(catalog, filter).filter(
        (teacher) => teacher.status === 'actif',
    ).length;
    const cycleOverview = useMemo(() => {
        const total = snapshot.effectifsTotal;
        const finance = new Map(
            collection.map((row) => [row.cycle, row] as const),
        );
        return snapshot.effectifs.map((item, index) => {
            const row = finance.get(item.cycle);

            return {
                ...item,
                share: total === 0 ? 0 : Math.round((item.count / total) * 100),
                collected: row?.collected ?? 0,
                outstanding: row?.outstanding ?? 0,
                rate: row?.rate ?? 0,
                fill: CHART_COLORS[index % CHART_COLORS.length],
            };
        });
    }, [collection, snapshot.effectifs, snapshot.effectifsTotal]);

    return (
        <>
            <Head title="Tableau de bord" />
            <PageShell>
                <PageHeader
                    title="Tableau de bord"
                    icon={LayoutGrid}
                    description={`${catalog.profile.name} · ${catalog.profile.city} · ${cycleLabel(filter.cycle)} · ${academicYearLabel}.`}
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <KpiCard
                        className="h-full"
                        icon={GraduationCap}
                        label="Effectifs élèves"
                        value={String(snapshot.effectifsTotal)}
                        hint={`${academicYearLabel} · tous cycles`}
                        loading={loading}
                    />
                    <Link
                        href={payments({ query })}
                        className="text-foreground hover:text-foreground block h-full no-underline"
                    >
                        <KpiCard
                            className="h-full"
                            icon={TrendingUp}
                            label="Taux de recouvrement"
                            value={`${totals.rate} %`}
                            hint={`${formatFcfa(totals.collected)} encaissés sur ${formatFcfa(totals.expected)}`}
                            loading={loading}
                        >
                            <div
                                className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full"
                                role="presentation"
                            >
                                <div
                                    className="bg-primary h-full rounded-full"
                                    style={{
                                        width: `${Math.min(totals.rate, 100)}%`,
                                    }}
                                />
                            </div>
                        </KpiCard>
                    </Link>
                    <Link
                        href={payments({ query })}
                        className="text-foreground hover:text-foreground block h-full no-underline"
                    >
                        <KpiCard
                            className="h-full"
                            icon={Wallet}
                            label="Impayés du mois"
                            value={formatFcfa(snapshot.unpaidMonthTotal)}
                            hint={`${snapshot.monthLabel} · ${cycleLabel(filter.cycle)}${
                                snapshot.unpaidMonthCount > 0
                                    ? ` · ${snapshot.unpaidMonthCount} dossier${snapshot.unpaidMonthCount > 1 ? 's' : ''}`
                                    : ''
                            }`}
                            loading={loading}
                        />
                    </Link>
                    <Link
                        href={attendance({ query })}
                        className="text-foreground hover:text-foreground block h-full no-underline"
                    >
                        <KpiCard
                            className="h-full"
                            icon={UserCheck}
                            label="Assiduité du jour"
                            value={`${presenceRate} %`}
                            hint={
                                lastRollCall
                                    ? `Appel du ${formatFrDate(lastRollCall)}`
                                    : 'Aucun appel enregistré'
                            }
                            loading={loading}
                        />
                    </Link>
                    <Link
                        href={teachers({ query })}
                        className="text-foreground hover:text-foreground block h-full no-underline"
                    >
                        <KpiCard
                            className="h-full"
                            icon={Briefcase}
                            label="Enseignants"
                            value={String(activeTeachers)}
                            hint="Actifs, tout l’établissement"
                            loading={loading}
                        />
                    </Link>
                </div>

                <section className="overflow-hidden rounded-[8px] border">
                    <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-[13px] font-semibold">
                                <GraduationCap className="text-primary size-4" />
                                Effectifs par cycle
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-[12px]">
                                Répartition des {snapshot.effectifsTotal} élèves
                                et recouvrement de {snapshot.monthLabel}.
                            </p>
                        </div>
                        <Link
                            href={students({ query })}
                            className="text-primary text-[13px] font-medium"
                        >
                            Voir les élèves →
                        </Link>
                    </div>
                    {loading ? (
                        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
                            {catalog.cycles.map((cycle) => (
                                <div
                                    key={cycle.value}
                                    className="bg-muted/40 h-28 animate-pulse rounded-[8px]"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-border grid gap-px sm:grid-cols-2 xl:grid-cols-5">
                            {cycleOverview.map((item) => {
                                const selected = item.cycle === filter.cycle;

                                return (
                                    <button
                                        key={item.cycle}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() =>
                                            setContext({ cycle: item.cycle })
                                        }
                                        className={cn(
                                            'bg-background hover:bg-muted/40 flex flex-col items-start gap-3 p-4 text-left transition-colors',
                                            selected && 'bg-primary/5',
                                        )}
                                    >
                                        <div className="flex w-full items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 text-[13px] font-semibold">
                                                <span
                                                    className="size-2.5 rounded-full"
                                                    style={{
                                                        background: item.fill,
                                                    }}
                                                />
                                                {item.label}
                                            </span>
                                            <span className="text-muted-foreground text-[12px]">
                                                {item.share} %
                                            </span>
                                        </div>
                                        <p className="text-[22px] font-semibold tracking-tight">
                                            {item.count}
                                            <span className="text-muted-foreground ml-1.5 text-[12px] font-medium">
                                                élève{item.count > 1 ? 's' : ''}
                                            </span>
                                        </p>
                                        <div className="w-full space-y-1.5">
                                            <div className="flex justify-between text-[12px]">
                                                <span className="text-muted-foreground">
                                                    Recouvrement
                                                </span>
                                                <span className="font-medium">
                                                    {item.rate} %
                                                </span>
                                            </div>
                                            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                                <div
                                                    className="bg-primary h-full rounded-full"
                                                    style={{
                                                        width: `${Math.min(item.rate, 100)}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-muted-foreground text-[11px]">
                                                {formatFcfa(item.collected)}{' '}
                                                encaissés ·{' '}
                                                {formatFcfa(item.outstanding)}{' '}
                                                dû
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <div className="grid gap-3 xl:grid-cols-3">
                    <ChartCard
                        className="xl:col-span-2"
                        title="Recouvrement par cycle"
                        description={`Scolarité de ${snapshot.monthLabel} : encaissé et reste dû.`}
                        summary={collection
                            .map(
                                (row) =>
                                    `${cycleLabel(row.cycle)} : ${formatFcfa(row.collected)} encaissés et ${formatFcfa(row.outstanding)} restant dû`,
                            )
                            .join('. ')}
                        icon={Wallet}
                        loading={loading}
                        legend={
                            <>
                                <ChartLegendItem color="var(--chart-1)">
                                    Encaissé
                                </ChartLegendItem>
                                <ChartLegendItem color="var(--chart-3)">
                                    Reste dû
                                </ChartLegendItem>
                                <span className="ml-auto">
                                    Total attendu {formatFcfa(totals.expected)}
                                </span>
                            </>
                        }
                    >
                        <BarChart
                            data={collection.map((row) => ({
                                ...row,
                                short: cycleShortLabel(row.cycle),
                            }))}
                            margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border)"
                            />
                            <XAxis
                                dataKey="short"
                                tickLine={false}
                                axisLine={false}
                                tick={CHART_AXIS}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={44}
                                tick={CHART_AXIS}
                                tickFormatter={compactFcfa}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)' }}
                                content={
                                    <ChartTooltipContent
                                        formatter={formatFcfa}
                                    />
                                }
                            />
                            <Bar
                                dataKey="collected"
                                name="Encaissé"
                                stackId="fees"
                                fill="var(--chart-1)"
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="outstanding"
                                name="Reste dû"
                                stackId="fees"
                                fill="var(--chart-3)"
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ChartCard>

                    <ChartCard
                        title="Répartition des effectifs"
                        description="Élèves inscrits par cycle."
                        summary={headcount
                            .map((row) => `${row.label} : ${row.count} élèves`)
                            .join('. ')}
                        icon={PieChartIcon}
                        loading={loading}
                        legend={headcount.map((row) => (
                            <ChartLegendItem key={row.cycle} color={row.fill}>
                                {row.label} · {row.count}
                            </ChartLegendItem>
                        ))}
                    >
                        <PieChart>
                            <Tooltip
                                content={
                                    <ChartTooltipContent
                                        formatter={(value) => `${value} élèves`}
                                    />
                                }
                            />
                            <Pie
                                data={headcount}
                                dataKey="count"
                                nameKey="label"
                                innerRadius={54}
                                outerRadius={88}
                                paddingAngle={2}
                                strokeWidth={0}
                                isAnimationActive={false}
                            >
                                {headcount.map((row) => (
                                    <Cell key={row.cycle} fill={row.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartCard>
                </div>

                <div className="grid gap-3 xl:grid-cols-3">
                    <ChartCard
                        title="Assiduité"
                        description="Taux de présence par journée d’appel."
                        summary={trend
                            .map(
                                (row) =>
                                    `${row.label} : ${row.rate} % de présence`,
                            )
                            .join('. ')}
                        icon={CalendarCheck}
                        loading={loading}
                        height={200}
                    >
                        <LineChart
                            data={trend}
                            margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border)"
                            />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tick={CHART_AXIS}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tickLine={false}
                                axisLine={false}
                                width={34}
                                tick={CHART_AXIS}
                                tickFormatter={(value: number) => `${value}%`}
                            />
                            <Tooltip
                                cursor={{ stroke: 'var(--border)' }}
                                content={
                                    <ChartTooltipContent
                                        formatter={(value) => `${value} %`}
                                    />
                                }
                            />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                name="Présence"
                                stroke="var(--chart-1)"
                                strokeWidth={2}
                                dot={{ r: 3, fill: 'var(--chart-1)' }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ChartCard>

                    <ChartCard
                        title="Appel du jour"
                        description={
                            lastRollCall
                                ? `Relevé du ${formatFrDate(lastRollCall)}.`
                                : 'Aucun appel enregistré.'
                        }
                        summary={rollCall
                            .map((row) => `${row.label} : ${row.count} élèves`)
                            .join('. ')}
                        icon={UserCheck}
                        loading={loading}
                        height={200}
                        legend={rollCall.map((row) => (
                            <ChartLegendItem key={row.status} color={row.fill}>
                                {row.label} · {row.count}
                            </ChartLegendItem>
                        ))}
                    >
                        <PieChart>
                            <Tooltip
                                content={
                                    <ChartTooltipContent
                                        formatter={(value) => `${value} élèves`}
                                    />
                                }
                            />
                            <Pie
                                data={rollCall}
                                dataKey="count"
                                nameKey="label"
                                innerRadius={46}
                                outerRadius={76}
                                paddingAngle={2}
                                strokeWidth={0}
                                isAnimationActive={false}
                            >
                                {rollCall.map((row) => (
                                    <Cell key={row.status} fill={row.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartCard>

                    <ChartCard
                        title="Remplissage des classes"
                        description="Effectif inscrit face à la capacité."
                        summary={occupancy
                            .map(
                                (row) =>
                                    `${row.label} : ${row.count} inscrits sur ${row.capacity} places`,
                            )
                            .join('. ')}
                        icon={GraduationCap}
                        loading={loading}
                        height={200}
                        legend={
                            <>
                                <ChartLegendItem color="var(--chart-1)">
                                    Inscrits
                                </ChartLegendItem>
                                <ChartLegendItem color="var(--chart-3)">
                                    Places libres
                                </ChartLegendItem>
                            </>
                        }
                    >
                        <BarChart
                            data={occupancy.map((row) => ({
                                ...row,
                                free: Math.max(row.capacity - row.count, 0),
                            }))}
                            layout="vertical"
                            margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
                        >
                            <CartesianGrid
                                horizontal={false}
                                stroke="var(--border)"
                            />
                            <XAxis
                                type="number"
                                tickLine={false}
                                axisLine={false}
                                tick={CHART_AXIS}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                width={72}
                                tick={CHART_AXIS}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)' }}
                                content={<ChartTooltipContent />}
                            />
                            <Bar
                                dataKey="count"
                                name="Inscrits"
                                stackId="seats"
                                fill="var(--chart-1)"
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="free"
                                name="Places libres"
                                stackId="seats"
                                fill="var(--chart-3)"
                                radius={[0, 4, 4, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ChartCard>
                </div>
            </PageShell>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Tableau de bord',
            href: dashboard(),
        },
    ],
};
