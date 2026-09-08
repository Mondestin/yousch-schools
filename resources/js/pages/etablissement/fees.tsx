import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Field } from '@/components/sms/field';
import { CycleBadge } from '@/components/sms/code-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatFcfa } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { apiData } from '@/lib/api';
import { useYearLock } from '@/hooks/use-year-lock';
import { upsert as upsertFees } from '@/routes/api/v1/school/fees';
import { fees as schoolFees, index as school } from '@/routes/etablissement';
import type { Cycle, FeeTariff, SchoolDataset } from '@/types/school';

type FeeKind = 'monthlyAmount' | 'enrollmentAmount' | 'reEnrollmentAmount';

const FEE_COLUMNS: { key: FeeKind; label: string; hint: string }[] = [
    {
        key: 'monthlyAmount',
        label: 'Mensualité',
        hint: 'Réglée chaque mois de l’année scolaire.',
    },
    {
        key: 'enrollmentAmount',
        label: 'Inscription',
        hint: 'Payée une fois par un élève qui entre dans l’établissement.',
    },
    {
        key: 'reEnrollmentAmount',
        label: 'Réinscription',
        hint: 'Payée une fois par un élève qui poursuit dans l’établissement.',
    },
];

type FeeAmounts = Record<Cycle, Record<FeeKind, number>>;

function toAmounts(fees: FeeTariff[]): FeeAmounts {
    return Object.fromEntries(
        fees.map((fee) => [
            fee.cycle,
            {
                monthlyAmount: fee.monthlyAmount,
                enrollmentAmount: fee.enrollmentAmount,
                reEnrollmentAmount: fee.reEnrollmentAmount,
            },
        ]),
    ) as FeeAmounts;
}

export default function SchoolFeesPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { locked, canMutate, lockHint } = useYearLock();
    const [amounts, setAmounts] = useState<FeeAmounts>(() =>
        toAmounts(catalog.fees),
    );
    const [saving, setSaving] = useState(false);

    const rows = useMemo(
        () =>
            catalog.cycles.map((cycle) => ({
                cycle: cycle.value,
                label: cycle.label,
                amounts: amounts[cycle.value],
            })),
        [amounts, catalog.cycles],
    );

    function reset(): void {
        setAmounts(toAmounts(catalog.fees));
    }

    function setAmount(cycle: Cycle, key: FeeKind, raw: string): void {
        const next = Number(raw);

        setAmounts((current) => ({
            ...current,
            [cycle]: {
                ...current[cycle],
                [key]: Number.isFinite(next) ? next : 0,
            },
        }));
    }

    async function save(): Promise<void> {
        if (locked) {
            return;
        }

        const fees = catalog.cycles.map((cycle) => ({
            cycle: cycle.value,
            monthlyAmount: amounts[cycle.value]?.monthlyAmount ?? 0,
            enrollmentAmount: amounts[cycle.value]?.enrollmentAmount ?? 0,
            reEnrollmentAmount: amounts[cycle.value]?.reEnrollmentAmount ?? 0,
        }));

        setSaving(true);

        try {
            const saved = await apiData<FeeTariff[]>(upsertFees.url(), {
                method: 'PUT',
                body: { fees },
            });
            setAmounts(toAmounts(saved));
            toastSaved('Tarifs enregistrés');
        } catch (error) {
            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Frais scolaires" />
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <Field
                    label="Tarifs par cycle"
                    hint="Montants en FCFA. La mensualité est récurrente, l’inscription et la réinscription sont dues une fois en début d’année."
                >
                    <div className="overflow-hidden rounded-[8px] border">
                        <Table containerClassName="rounded-none border-0">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Cycle</TableHead>
                                    {FEE_COLUMNS.map((column) => (
                                        <TableHead key={column.key}>
                                            {column.label}
                                        </TableHead>
                                    ))}
                                    <TableHead>Première année</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.cycle}>
                                        <TableCell>
                                            <CycleBadge cycle={row.cycle} />
                                        </TableCell>
                                        {FEE_COLUMNS.map((column) => (
                                            <TableCell key={column.key}>
                                                <div className="flex max-w-[10rem] items-center gap-2">
                                                    <Input
                                                        id={`fee-${column.key}-${row.cycle}`}
                                                        type="number"
                                                        min={0}
                                                        step={500}
                                                        inputMode="numeric"
                                                        aria-label={`${column.label} ${row.label}`}
                                                        value={
                                                            row.amounts?.[
                                                                column.key
                                                            ] ?? 0
                                                        }
                                                        onChange={(event) =>
                                                            setAmount(
                                                                row.cycle,
                                                                column.key,
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                    <span className="text-muted-foreground text-[13px]">
                                                        FCFA
                                                    </span>
                                                </div>
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-muted-foreground">
                                            {formatFcfa(
                                                (row.amounts?.monthlyAmount ??
                                                    0) +
                                                    (row.amounts
                                                        ?.enrollmentAmount ??
                                                        0),
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Field>

                <dl className="grid gap-3 sm:grid-cols-3">
                    {FEE_COLUMNS.map((column) => (
                        <div key={column.key}>
                            <dt className="text-[13px] font-medium">
                                {column.label}
                            </dt>
                            <dd className="text-muted-foreground text-[13px]">
                                {column.hint}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={reset}>
                        Annuler
                    </Button>
                    {canMutate ? (
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </Button>
                    ) : null}
                </div>
                {lockHint ? (
                    <p className="text-amber-800 text-[12px]">{lockHint}</p>
                ) : null}
            </form>
        </>
    );
}

SchoolFeesPage.layout = {
    breadcrumbs: [
        { title: 'Établissement', href: school() },
        { title: 'Frais scolaires', href: schoolFees() },
    ],
};
