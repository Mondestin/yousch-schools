import { Head } from '@inertiajs/react';
import {
    Box,
    CircleDot,
    Download,
    Pencil,
    Plus,
    ReceiptText,
    XCircle,
} from 'lucide-react';
import {
    useMemo,
    useState,
    type FormEvent,
    type HTMLInputTypeAttribute,
} from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { downloadSubscriptionInvoicePdf } from '@/lib/school-subscription-pdf';
import {
    formatFcfa,
    formatFrDate,
    paymentStatusLabel,
} from '@/lib/school-rows';
import {
    PLAN_OFFERS,
    planLabel,
    subscriptionStatusLabel,
    type PlanOffer,
} from '@/lib/school-subscription';
import { toastSaved, toastStub } from '@/lib/school-toast';
import {
    MOBILE_MONEY_PROVIDERS,
    normalizeMobileMoneyPhone,
    type MobileMoneyAccount,
    type MobileMoneyProvider,
} from '@/lib/school-mobile-money';
import { subscription } from '@/routes/organisation';
import type {
    PaymentStatus,
    SchoolDataset,
    SubscriptionPlan,
    SubscriptionReceipt,
} from '@/types/school';

type BillingPeriod = 'monthly' | 'annual';

type Address = {
    name: string;
    email: string;
    address: string;
    city: string;
    country: string;
    vat: string;
};
const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
    paye: 'success',
    partiel: 'warning',
    impaye: 'danger',
};

export default function OrganisationSubscriptionPage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { profile, subscription: item } = catalog;
    const [plan, setPlan] = useState<SubscriptionPlan>(item.plan);
    const [period, setPeriod] = useState<BillingPeriod>('monthly');
    const [payment, setPayment] = useState<MobileMoneyAccount | null>(null);
    const [draftProvider, setDraftProvider] =
        useState<MobileMoneyProvider>('airtel');
    const [draftPhone, setDraftPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [address, setAddress] = useState<Address>({
        name: profile.name,
        email: profile.email,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        vat: '',
    });
    const [planOpen, setPlanOpen] = useState(false);
    const [addressOpen, setAddressOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const nextReceipt = useMemo(
        () =>
            item.receipts.find((receipt) => receipt.status !== 'paye') ?? null,
        [item.receipts],
    );
    const offer =
        PLAN_OFFERS.find((candidate) => candidate.plan === plan) ??
        PLAN_OFFERS[0]!;
    const amount =
        period === 'annual' ? offer.monthlyAmount * 10 : offer.monthlyAmount;

    function downloadReceipt(receipt: SubscriptionReceipt): void {
        downloadSubscriptionInvoicePdf({
            profile: {
                ...profile,
                name: address.name,
                email: address.email,
                address: address.address,
                city: address.city,
                country: address.country,
            },
            receipt,
        });
        toastSaved('Facture PDF téléchargée');
    }
    function openPaymentDialog(open: boolean): void {
        if (open) {
            setDraftProvider(payment?.provider ?? 'airtel');
            setDraftPhone(payment?.phone ?? '');
            setPhoneError('');
        }
        setPaymentOpen(open);
    }

    function savePayment(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const phone = normalizeMobileMoneyPhone(draftPhone);
        if (!phone) {
            setPhoneError(
                'Saisissez un numéro avec son indicatif pays, par exemple +242 06 123 45 67.',
            );
            return;
        }
        setPayment({ provider: draftProvider, phone });
        setPaymentOpen(false);
        toastSaved('Préférence de paiement enregistrée');
    }

    function saveAddress(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        setAddressOpen(false);
        toastSaved('Adresse de facturation mise à jour');
    }

    return (
        <>
            <Head title="Facturation" />
            <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto flex max-w-6xl flex-col gap-12 pb-8 sm:gap-14">
                    <header>
                        <h1 className="text-[24px] font-semibold tracking-tight">
                            Facturation
                        </h1>
                        <p className="text-muted-foreground mt-1 text-[13px]">
                            Gérez votre abonnement, votre utilisation et vos
                            informations de facturation.
                        </p>
                    </header>
                    <section className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                        <div className="grid md:grid-cols-2">
                            <div className="flex min-h-36 flex-col justify-between gap-5 border-b p-5 md:border-r md:border-b-0">
                                <div className="flex items-start gap-3">
                                    <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-[8px] border">
                                        <Box className="text-muted-foreground size-4" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-semibold">
                                            {planLabel(plan)}
                                        </p>
                                        <p className="text-muted-foreground text-[12px]">
                                            {offer.seats} sièges ·{' '}
                                            {item.usedSeats} utilisés
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-fit"
                                    onClick={() => setPlanOpen(true)}
                                >
                                    Changer de formule
                                </Button>
                            </div>
                            <div className="flex min-h-36 flex-col justify-between gap-4 p-5">
                                <div>
                                    <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                                        Prochaine facture{' '}
                                        <CircleDot className="text-muted-foreground size-3.5" />
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-[12px]">
                                        Renouvellement le{' '}
                                        {formatFrDate(item.renewsOn)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-[12px]">
                                        Montant à régler
                                    </p>
                                    <p className="mt-1 text-[24px] font-semibold tracking-tight">
                                        {formatFcfa(
                                            nextReceipt?.amount ?? amount,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-sidebar-foreground text-[15px] font-semibold">
                                Coordonnées de facturation
                            </h2>
                            <p className="text-muted-foreground mt-1 text-[13px]">
                                Gérez vos moyens de paiement et vos informations
                                de facturation.
                            </p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                            <section className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                                <div className="border-border/80 flex items-start justify-between gap-3 border-b px-5 py-4">
                                    <div>
                                        <h3 className="text-[13px] font-semibold">
                                            Adresse
                                        </h3>
                                        <p className="text-muted-foreground mt-0.5 text-[13px]">
                                            Mettez à jour votre adresse de
                                            facturation.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="size-8"
                                        aria-label="Modifier l’adresse de facturation"
                                        onClick={() => setAddressOpen(true)}
                                    >
                                        <Pencil className="size-3.5" />
                                    </Button>
                                </div>
                                <dl className="divide-border/60 divide-y px-5 py-1">
                                    <BillingRow
                                        label="E-mail"
                                        value={address.email}
                                    />
                                    <BillingRow
                                        label="Établissement"
                                        value={address.name}
                                    />
                                    <BillingRow
                                        label="Adresse"
                                        value={[
                                            address.address,
                                            address.city,
                                            address.country,
                                        ].join(', ')}
                                    />
                                    <BillingRow
                                        label="N° TVA"
                                        value={address.vat || 'Non renseigné'}
                                    />
                                </dl>
                            </section>
                            <section className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                                <div className="border-border/80 flex items-start justify-between gap-3 border-b px-5 py-4">
                                    <div>
                                        <h3 className="text-[13px] font-semibold">
                                            Paiement
                                        </h3>
                                        <p className="text-muted-foreground mt-0.5 text-[13px]">
                                            Gérez vos moyens de paiement.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="size-8"
                                        aria-label="Ajouter un moyen de paiement"
                                        onClick={() => openPaymentDialog(true)}
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                                {payment ? (
                                    <div className="flex min-h-44 items-center gap-3 px-4">
                                        <div className="bg-muted flex size-10 items-center justify-center rounded-[8px] border">
                                            <img
                                                src={
                                                    MOBILE_MONEY_PROVIDERS[
                                                        payment.provider
                                                    ].logo
                                                }
                                                alt=""
                                                className="h-8 w-12 object-contain"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium">
                                                {
                                                    MOBILE_MONEY_PROVIDERS[
                                                        payment.provider
                                                    ].label
                                                }
                                            </p>
                                            <p className="text-muted-foreground text-[13px]">
                                                {payment.phone}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground flex min-h-44 items-center justify-center px-4 text-center text-[13px]">
                                        Aucun moyen de paiement enregistré.
                                    </div>
                                )}
                            </section>
                        </div>
                    </section>
                    <section
                        aria-labelledby="billing-history-title"
                        className="space-y-4"
                    >
                        <div>
                            <h2
                                id="billing-history-title"
                                className="text-sidebar-foreground text-[15px] font-semibold"
                            >
                                Historique
                            </h2>
                            <p className="text-muted-foreground mt-1 text-[13px]">
                                Consultez et suivez vos factures passées et
                                l’historique des paiements.
                            </p>
                        </div>
                        <Table
                            aria-label="Historique des factures"
                            containerClassName="rounded-xl border-border/80 bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                            className="[&_th]:border-border/80 [&_th]:bg-muted/40 [&_th]:text-muted-foreground [&_td]:border-border/60 min-w-[640px] text-left text-[13px] [&_tbody_tr:last-child_td]:border-b-0 [&_td]:border-r-0 [&_td]:px-5 [&_td]:py-3.5 [&_th]:static [&_th]:border-r-0 [&_th]:px-5 [&_th]:py-3"
                        >
                            <TableHeader>
                                <TableRow>
                                    <TableHead scope="col">Référence</TableHead>
                                    <TableHead scope="col">Total TTC</TableHead>
                                    <TableHead scope="col">Date</TableHead>
                                    <TableHead
                                        scope="col"
                                        className="text-right"
                                    >
                                        <span className="sr-only">
                                            Statut et téléchargement
                                        </span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="hover:[&>td]:bg-secondary/60">
                                    <TableCell>À venir</TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatFcfa(amount)}
                                    </TableCell>
                                    <TableCell>
                                        {formatFrDate(item.renewsOn)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant="muted"
                                            className="border-transparent leading-none"
                                        >
                                            À venir
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                {item.receipts.map((receipt) => (
                                    <TableRow
                                        key={receipt.id}
                                        className="hover:[&>td]:bg-secondary/60"
                                    >
                                        <TableCell>
                                            {receipt.reference}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatFcfa(receipt.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {formatFrDate(
                                                receipt.paidOn ?? item.renewsOn,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Badge
                                                    variant={
                                                        statusVariant[
                                                            receipt.status
                                                        ]
                                                    }
                                                    className="border-transparent leading-none"
                                                >
                                                    {paymentStatusLabel(
                                                        receipt.status,
                                                    )}
                                                </Badge>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:bg-secondary hover:text-sidebar-foreground size-8 rounded-md"
                                                    aria-label={
                                                        'Télécharger la facture ' +
                                                        receipt.reference
                                                    }
                                                    onClick={() =>
                                                        downloadReceipt(receipt)
                                                    }
                                                >
                                                    <Download className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                type="button"
                                variant="destructive"
                                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                                onClick={() =>
                                    toastStub('Résiliation de l’abonnement')
                                }
                            >
                                <XCircle className="size-4" />
                                Résilier l’abonnement
                            </Button>
                            <p className="text-muted-foreground flex items-center gap-2 text-[13px]">
                                <ReceiptText className="size-4" />
                                Statut de l’abonnement :{' '}
                                {subscriptionStatusLabel(item.status)}
                            </p>
                        </div>
                    </section>
                </div>
            </main>
            <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Changer de formule</DialogTitle>
                        <DialogDescription>
                            Sélectionnez la formule et la période de facturation
                            adaptées à votre établissement.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <fieldset className="space-y-2">
                            <legend className="text-[13px] font-medium">
                                Facturation
                            </legend>
                            <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-[8px] border p-1">
                                <PeriodButton
                                    active={period === 'monthly'}
                                    onClick={() => setPeriod('monthly')}
                                    title="Mensuelle"
                                    detail="Paiement chaque mois"
                                />
                                <PeriodButton
                                    active={period === 'annual'}
                                    onClick={() => setPeriod('annual')}
                                    title="Annuelle"
                                    detail="2 mois offerts"
                                />
                            </div>
                        </fieldset>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {PLAN_OFFERS.map((candidate) => (
                                <PlanOption
                                    key={candidate.plan}
                                    offer={candidate}
                                    period={period}
                                    active={candidate.plan === plan}
                                    onClick={() => setPlan(candidate.plan)}
                                />
                            ))}
                        </div>
                        <div className="bg-muted/50 flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px]">
                            <span className="text-muted-foreground">
                                Formule sélectionnée
                            </span>
                            <span className="font-medium">
                                {planLabel(plan)} · {formatFcfa(amount)}{' '}
                                {period === 'annual' ? 'par an' : 'par mois'}
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPlanOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setPlanOpen(false);
                                toastSaved(
                                    'Formule de facturation mise à jour',
                                );
                            }}
                        >
                            Mettre à jour
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={addressOpen} onOpenChange={setAddressOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Adresse de facturation</DialogTitle>
                        <DialogDescription>
                            Ces informations apparaîtront sur vos prochaines
                            factures.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={saveAddress}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormField
                                label="Établissement"
                                value={address.name}
                                onChange={(value) =>
                                    setAddress({ ...address, name: value })
                                }
                            />
                            <FormField
                                label="E-mail"
                                type="email"
                                value={address.email}
                                onChange={(value) =>
                                    setAddress({ ...address, email: value })
                                }
                            />
                        </div>
                        <FormField
                            label="Adresse"
                            value={address.address}
                            onChange={(value) =>
                                setAddress({ ...address, address: value })
                            }
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormField
                                label="Ville"
                                value={address.city}
                                onChange={(value) =>
                                    setAddress({ ...address, city: value })
                                }
                            />
                            <FormField
                                label="Pays"
                                value={address.country}
                                onChange={(value) =>
                                    setAddress({ ...address, country: value })
                                }
                            />
                        </div>
                        <FormField
                            label="N° TVA (facultatif)"
                            value={address.vat}
                            onChange={(value) =>
                                setAddress({ ...address, vat: value })
                            }
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddressOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit">Enregistrer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={paymentOpen} onOpenChange={openPaymentDialog}>
                <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {payment
                                ? 'Modifier le moyen de paiement'
                                : 'Ajouter un moyen de paiement'}
                        </DialogTitle>
                        <DialogDescription>
                            Choisissez votre opérateur et renseignez le numéro
                            associé à votre compte Mobile Money.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={savePayment}
                        className="space-y-5"
                        noValidate
                    >
                        <fieldset className="space-y-3">
                            <legend className="text-[13px] font-medium">
                                Opérateur
                            </legend>
                            <div className="grid grid-cols-2 gap-3">
                                {(
                                    Object.keys(
                                        MOBILE_MONEY_PROVIDERS,
                                    ) as MobileMoneyProvider[]
                                ).map((provider) => (
                                    <label
                                        key={provider}
                                        className="has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-primary relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border p-4 has-focus-visible:ring-2"
                                    >
                                        <input
                                            type="radio"
                                            name="mobile-money-provider"
                                            value={provider}
                                            checked={draftProvider === provider}
                                            onChange={() =>
                                                setDraftProvider(provider)
                                            }
                                            className="accent-primary absolute top-3 right-3 size-4"
                                        />
                                        <img
                                            src={
                                                MOBILE_MONEY_PROVIDERS[provider]
                                                    .logo
                                            }
                                            alt=""
                                            className="h-14 w-24 rounded bg-white object-contain"
                                        />
                                        <span className="text-[13px] font-medium">
                                            {
                                                MOBILE_MONEY_PROVIDERS[provider]
                                                    .label
                                            }
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <div className="space-y-2">
                            <Label htmlFor="mobile-money-phone">
                                Numéro de téléphone
                            </Label>
                            <Input
                                id="mobile-money-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="+242 06 123 45 67"
                                required
                                value={draftPhone}
                                onChange={(event) => {
                                    setDraftPhone(event.target.value);
                                    setPhoneError('');
                                }}
                                aria-invalid={Boolean(phoneError)}
                                aria-describedby={
                                    phoneError
                                        ? 'mobile-money-phone-error'
                                        : 'mobile-money-phone-help'
                                }
                            />
                            {phoneError ? (
                                <p
                                    id="mobile-money-phone-error"
                                    role="alert"
                                    className="text-destructive text-[13px]"
                                >
                                    {phoneError}
                                </p>
                            ) : (
                                <p
                                    id="mobile-money-phone-help"
                                    className="text-muted-foreground text-[13px]"
                                >
                                    Incluez l’indicatif pays, suivi du numéro de
                                    votre compte.
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPaymentOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit">Enregistrer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function BillingRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3 text-[13px]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 leading-relaxed">{value}</dd>
        </div>
    );
}
function PeriodButton({
    active,
    onClick,
    title,
    detail,
}: {
    active: boolean;
    onClick: () => void;
    title: string;
    detail: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                active
                    ? 'bg-background rounded-[6px] px-3 py-2 text-left shadow-sm transition-colors'
                    : 'text-muted-foreground hover:text-foreground rounded-[6px] px-3 py-2 text-left transition-colors'
            }
        >
            <span className="block text-[13px] font-medium">{title}</span>
            <span className="text-muted-foreground block text-[11px]">
                {detail}
            </span>
        </button>
    );
}
function PlanOption({
    offer,
    period,
    active,
    onClick,
}: {
    offer: PlanOffer;
    period: BillingPeriod;
    active: boolean;
    onClick: () => void;
}) {
    const price =
        period === 'annual' ? offer.monthlyAmount * 10 : offer.monthlyAmount;
    const tier =
        offer.plan === 'gold'
            ? 'Essentiel'
            : offer.plan === 'platinium'
              ? 'Pro'
              : 'Avancé';
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                active
                    ? 'border-primary bg-primary/5 ring-primary rounded-[8px] border p-4 text-left ring-1 transition-colors'
                    : 'hover:bg-muted/50 rounded-[8px] border p-4 text-left transition-colors'
            }
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold">{offer.label}</span>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
                    {tier}
                </span>
            </div>
            <p className="mt-4 text-[20px] font-semibold tracking-tight">
                {formatFcfa(price)}
            </p>
            <p className="text-muted-foreground text-[12px]">
                {period === 'annual' ? 'par an' : 'par mois'}
            </p>
            <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
                {offer.seats} sièges inclus pour votre équipe.
            </p>
        </button>
    );
}
function FormField({
    label,
    value,
    onChange,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: HTMLInputTypeAttribute;
}) {
    const id = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}
OrganisationSubscriptionPage.layout = {
    breadcrumbs: [{ title: 'Abonnement', href: subscription() }],
};
