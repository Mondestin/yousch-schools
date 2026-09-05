import { Head } from '@inertiajs/react';
import {
    CalendarDays,
    CircleDot,
    CreditCard,
    Download,
    EllipsisVertical,
    Hash,
    Printer,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useClientTable } from '@/hooks/use-client-table';
import {
    formatFcfa,
    formatFrDate,
    paymentStatusLabel,
} from '@/lib/school-rows';
import { toastStub } from '@/lib/school-toast';
import {
    PLAN_OFFERS,
    planLabel,
    subscriptionMethodLabel,
    subscriptionStatusLabel,
} from '@/lib/school-subscription';
import { cn } from '@/lib/utils';
import { subscription } from '@/routes/etablissement';
import type {
    PaymentStatus,
    SchoolDataset,
    SubscriptionPlan,
} from '@/types/school';

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
    paye: 'success',
    partiel: 'warning',
    impaye: 'danger',
};

export default function SchoolSubscriptionPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const item = catalog.subscription;
    const [plan, setPlan] = useState<SubscriptionPlan>(item.plan);
    const [search, setSearch] = useState('');
    const pending = plan !== item.plan;

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (query === '') {
            return item.receipts;
        }

        return item.receipts.filter((receipt) =>
            `${receipt.reference} ${receipt.periodLabel} ${planLabel(receipt.plan)}`
                .toLowerCase()
                .includes(query),
        );
    }, [item.receipts, search]);
    const table = useClientTable(rows);

    return (
        <>
            <Head title="Abonnement" />
            <div className="space-y-8">
                <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[20px] font-semibold">
                                {planLabel(item.plan)}
                            </h2>
                            <Badge
                                variant={
                                    item.status === 'active'
                                        ? 'success'
                                        : 'danger'
                                }
                            >
                                {subscriptionStatusLabel(item.status)}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                disabled={!pending}
                                onClick={() =>
                                    toastStub(
                                        `Passage à l’offre ${planLabel(plan)}`,
                                    )
                                }
                            >
                                <CreditCard />
                                {pending
                                    ? `Passer à ${planLabel(plan)}`
                                    : 'Changer d’offre'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => toastStub('Ajout de sièges')}
                            >
                                Ajouter des sièges
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <section className="space-y-3">
                    <div>
                        <h3 className="text-[15px] font-semibold">
                            Types d’abonnement
                        </h3>
                        <p className="text-muted-foreground text-[13px]">
                            Trois offres, facturées à l’école et payables au
                            mois.
                        </p>
                    </div>
                    <div
                        role="radiogroup"
                        aria-label="Type d’abonnement"
                        className="flex flex-wrap gap-2"
                    >
                        {PLAN_OFFERS.map((offer) => {
                            const active = offer.plan === plan;

                            return (
                                <button
                                    key={offer.plan}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setPlan(offer.plan)}
                                    className={cn(
                                        'rounded-[8px] border px-4 py-2 text-[14px] font-medium transition-colors',
                                        active
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'hover:bg-muted/50',
                                    )}
                                >
                                    {offer.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <ListPage
                    embedded
                    title="Reçus passés"
                    icon={Wallet}
                    description="Historique des mensualités facturées à l’école."
                    searchPlaceholder="Rechercher une référence, une période..."
                    search={search}
                    onSearchChange={setSearch}
                    empty={{
                        title: search.trim() ? 'Aucun résultat' : 'Aucun reçu',
                        description: search.trim()
                            ? undefined
                            : 'Aucune mensualité n’a encore été facturée.',
                        icon: Wallet,
                    }}
                    paging={table}
                >
                    <Table containerClassName={DATA_TABLE_CONTAINER}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <DataTableColumnHeader icon={Hash}>
                                        Référence
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={CalendarDays}>
                                        Période
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={CreditCard}>
                                        Offre
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Wallet}>
                                        Montant
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={CircleDot}>
                                        Statut
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead className="w-14 text-center">
                                    <DataTableColumnHeader
                                        icon={EllipsisVertical}
                                    >
                                        Actions
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.pageRows.map((receipt) => (
                                <TableRow key={receipt.id}>
                                    <TableCell className="font-medium">
                                        {receipt.reference}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.periodLabel}
                                        <span className="text-muted-foreground">
                                            {receipt.paidOn
                                                ? ` · ${formatFrDate(receipt.paidOn)}`
                                                : ' · non réglé'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="code">
                                            {planLabel(receipt.plan)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {formatFcfa(receipt.amount)}
                                        <span className="text-muted-foreground">
                                            {' · '}
                                            {subscriptionMethodLabel(
                                                receipt.method,
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                statusVariant[receipt.status]
                                            }
                                        >
                                            {paymentStatusLabel(receipt.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={[
                                                {
                                                    label: 'Télécharger le reçu',
                                                    icon: Download,
                                                    onSelect: () =>
                                                        toastStub(
                                                            'Téléchargement du reçu',
                                                        ),
                                                },
                                                {
                                                    label: 'Imprimer le reçu',
                                                    icon: Printer,
                                                    onSelect: () =>
                                                        toastStub(
                                                            'Impression du reçu',
                                                        ),
                                                },
                                            ]}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ListPage>

                <p className="text-muted-foreground text-[13px]">
                    L’abonnement est facturé à l’école, pas aux parents. Un
                    siège = un compte administration (admin, directeur,
                    secrétaire, enseignant).
                </p>
            </div>
        </>
    );
}

SchoolSubscriptionPage.layout = {
    breadcrumbs: [{ title: 'Abonnement', href: subscription() }],
};
