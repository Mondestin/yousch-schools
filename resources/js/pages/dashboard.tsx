import { Head, Link, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Briefcase,
    GraduationCap,
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
import { CakeChart } from '@/components/sms/cake-chart';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
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
    genderMix,
    headcountByCycle,
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
import { index as teachers } from '@/routes/teachers';
import type { Auth } from '@/types/auth';
import type { SchoolDataset } from '@/types/school';

const compactFcfa = (value: number): string =>
    `${new Intl.NumberFormat('fr-FR', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value)}`;

function greetingForHour(hour: number): string {
    if (hour < 12) {
        return 'Bonjour';
    }

    if (hour < 18) {
        return 'Bon après-midi';
    }

    return 'Bonsoir';
}

function firstName(fullName: string): string {
    const part = fullName.trim().split(/\s+/)[0] ?? '';

    return part || 'là';
}

export default function Dashboard({ catalog }: { catalog: SchoolDataset }) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { filter, query, academicYearLabel } = useSchoolContext();
    const loading = useVisitPending();
    const snapshot = dashboardSnapshot(catalog, filter);
    const now = new Date();
    const greeting = greetingForHour(now.getHours());
    const name = firstName(auth.user.name);
    const dateLabel = format(now, 'EEEE d MMMM yyyy', { locale: fr });

    const collection = useMemo(
        () => collectionByCycle(catalog, filter.academicYearId, snapshot.month),
        [catalog, filter.academicYearId, snapshot.month],
    );
    const totals = useMemo(() => collectionTotals(collection), [collection]);
    const headcount = useMemo(
        () => headcountByCycle(catalog, filter.academicYearId),
        [catalog, filter.academicYearId],
    );
    const genders = useMemo(
        () => genderMix(catalog, filter.academicYearId),
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
    const presenceRate = [...trend].reverse().find((row) => row.rate !== null)
        ?.rate ?? 0;
    const activeTeachers = teacherRows(catalog, filter).filter(
        (teacher) => teacher.status === 'actif',
    ).length;
    const classroomCount = catalog.classrooms.filter(
        (classroom) => classroom.academicYearId === filter.academicYearId,
    ).length;

    return (
        <>
            <Head title="Tableau de bord" />
            <PageShell>
                <header className="shrink-0">
                    <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-[2rem]">
                        <span className="text-primary">{greeting}</span>
                        <span className="text-foreground">, </span>
                        <span className="text-brand-secondary">{name}</span>{' '}
                        <span className="text-brand-secondary" aria-hidden="true">
                            !
                        </span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-[14px] first-letter:uppercase">
                        {dateLabel}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">
                        {catalog.profile.name} · {catalog.profile.city} ·{' '}
                        {cycleLabel(filter.cycle)} · {academicYearLabel}
                    </p>
                </header>

                <KpiGrid className="xl:grid-cols-5">
                    <KpiCard
                        className="h-full"
                        icon={GraduationCap}
                        label="Effectifs élèves"
                        value={String(snapshot.effectifsTotal)}
                        hint={
                            classroomCount > 0
                                ? `Sur ${classroomCount} classe${classroomCount > 1 ? 's' : ''}`
                                : `${academicYearLabel} · tous cycles`
                        }
                        loading={loading}
                    />
                    <Link
                        href={teachers({ query })}
                        className="block h-full"
                    >
                        <KpiCard
                            className="h-full"
                            icon={Briefcase}
                            label="Enseignants"
                            value={String(activeTeachers)}
                            hint="Actifs"
                            loading={loading}
                        />
                    </Link>
                    <Link
                        href={attendance({ query })}
                        className="block h-full"
                    >
                        <KpiCard
                            className="h-full"
                            icon={UserCheck}
                            label="Assiduité du jour"
                            value={`${presenceRate} %`}
                            hint={
                                lastRollCall
                                    ? formatFrDate(lastRollCall)
                                    : 'Aucun appel'
                            }
                            loading={loading}
                        />
                    </Link>
                    <Link
                        href={payments({ query })}
                        className="block h-full"
                    >
                        <KpiCard
                            className="h-full"
                            icon={TrendingUp}
                            label="Taux de recouvrement"
                            value={`${totals.rate} %`}
                            hint={`${formatFcfa(totals.collected)} encaissés`}
                            loading={loading}
                        />
                    </Link>
                    <Link
                        href={payments({ query })}
                        className="block h-full"
                    >
                        <KpiCard
                            className="h-full"
                            icon={Wallet}
                            label="Impayés du mois"
                            value={formatFcfa(snapshot.unpaidMonthTotal)}
                            hint={
                                snapshot.unpaidMonthCount > 0
                                    ? `${snapshot.unpaidMonthCount} dossier${snapshot.unpaidMonthCount > 1 ? 's' : ''}`
                                    : snapshot.monthLabel
                            }
                            loading={loading}
                        />
                    </Link>
                </KpiGrid>

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
                        loading={loading}
                        legend={
                            <>
                                <ChartLegendItem color="var(--chart-1)">
                                    Encaissé
                                </ChartLegendItem>
                                <ChartLegendItem color="var(--chart-2)">
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
                                fill="var(--chart-2)"
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ChartCard>

                    <ChartCard
                        title="Répartition des effectifs"
                        description="Élèves inscrits par cycle, avec le détail du primaire."
                        summary={headcount
                            .map((row) => `${row.label} : ${row.count} élèves`)
                            .join('. ')}
                        loading={loading}
                        legend={headcount.map((row) => (
                            <ChartLegendItem key={row.id} color={row.fill}>
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
                                    <Cell key={row.id} fill={row.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartCard>
                </div>

                <div className="grid gap-3 xl:grid-cols-3">
                    <ChartCard
                        title="Assiduité"
                        description="Taux de présence sur 7 jours."
                        summary={trend
                            .filter((row) => row.rate !== null)
                            .map(
                                (row) =>
                                    `${row.label} : ${row.rate} % de présence`,
                            )
                            .join('. ')}
                        loading={loading}
                        height={200}
                    >
                        <LineChart
                            data={trend}
                            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
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
                                interval={0}
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
                                        formatter={(value) =>
                                            value === null || value === undefined
                                                ? 'Pas d’appel'
                                                : `${value} %`
                                        }
                                    />
                                }
                            />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                name="Présence"
                                stroke="var(--chart-2)"
                                strokeWidth={2}
                                connectNulls
                                dot={{ r: 3, fill: 'var(--chart-2)' }}
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
                        title="Filles et garçons"
                        description="Répartition des élèves inscrits par sexe."
                        summary={genders
                            .map((row) => `${row.label} : ${row.count} élèves`)
                            .join('. ')}
                        loading={loading}
                        height={220}
                        custom
                        legend={genders.map((row) => (
                            <ChartLegendItem key={row.key} color={row.fill}>
                                {row.label} · {row.count}
                            </ChartLegendItem>
                        ))}
                    >
                        <CakeChart
                            height={220}
                            slices={genders.map((row) => ({
                                key: row.key,
                                label: row.label,
                                count: row.count,
                                fill: row.fill,
                            }))}
                        />
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
