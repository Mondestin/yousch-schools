import { Head, Link, usePage } from '@inertiajs/react';
import {
    Banknote,
    BookOpenCheck,
    Building2,
    CalendarDays,
    Check,
    ClipboardCheck,
    GraduationCap,
    LayoutDashboard,
    School,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyStateIcon } from '@/components/sms/empty-state-icon';
import { Button } from '@/components/ui/button';
import { formatFcfa } from '@/lib/school-rows';
import { PLAN_OFFERS } from '@/lib/school-subscription';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import type { SchoolDataset } from '@/types/school';

const MODULES: {
    icon: LucideIcon;
    title: string;
    body: string;
    points: string[];
}[] = [
    {
        icon: Users,
        title: 'Élèves & familles',
        body: 'Toute la vie administrative de l’élève, du dossier d’inscription au suivi des parents.',
        points: [
            'Inscriptions et réinscriptions',
            'Fiches tuteurs et contacts',
            'Dossiers et pièces jointes',
            'Suivi disciplinaire',
        ],
    },
    {
        icon: BookOpenCheck,
        title: 'Notes & bulletins',
        body: 'Saisie des évaluations, calcul des moyennes et édition des bulletins officiels.',
        points: [
            'Devoirs et compositions',
            'Mentions et rangs de classe',
            'Bulletins PDF / impression',
            'Contrôle pédagogique',
        ],
    },
    {
        icon: CalendarDays,
        title: 'Emploi du temps',
        body: 'Planifiez la semaine par classe avec détection des conflits enseignants et salles.',
        points: [
            'Grille hebdomadaire',
            'Créneaux et matières',
            'Affectation des salles',
            'Alertes de chevauchement',
        ],
    },
    {
        icon: ClipboardCheck,
        title: 'Présences',
        body: 'L’appel du jour suit l’emploi du temps : absences, retards et justificatifs.',
        points: [
            'Appel lié aux créneaux',
            'Statuts d’absence',
            'Justificatifs classés',
            'Historique par élève',
        ],
    },
    {
        icon: Banknote,
        title: 'Scolarité & caisse',
        body: 'Tarifs par cycle, encaissements, reçus et suivi de caisse pour la direction.',
        points: [
            'Mensualités et arriérés',
            'Reçus téléchargeables',
            'Mouvements de caisse',
            'Synthèses financières',
        ],
    },
    {
        icon: LayoutDashboard,
        title: 'Bureau & structure',
        body: 'Pilotez l’année scolaire, le personnel et l’abonnement Yousch depuis un seul bureau.',
        points: [
            'Cycles et classes',
            'Horaires d’ouverture',
            'Utilisateurs et rôles',
            'Abonnement et sièges',
        ],
    },
];

const STEPS: {
    n: string;
    icon: LucideIcon;
    title: string;
    body: string;
    points: string[];
}[] = [
    {
        n: '01',
        icon: Building2,
        title: 'Configurez l’établissement',
        body: 'Posez l’identité de l’école et la structure pédagogique avant la rentrée.',
        points: [
            'Logo, tampon et coordonnées',
            'Années, trimestres et cycles',
            'Classes, séries et salles',
            'Tarifs de scolarité',
        ],
    },
    {
        n: '02',
        icon: School,
        title: 'Faites tourner le quotidien',
        body: 'Chaque service travaille sur les mêmes données, sans doubles saisies.',
        points: [
            'Inscriptions et admissions',
            'Notes et appels',
            'Emploi du temps vivant',
            'Paiements au fil de l’eau',
        ],
    },
    {
        n: '03',
        icon: GraduationCap,
        title: 'Remettez des documents propres',
        body: 'Parents et inspection reçoivent des documents cohérents avec votre charte.',
        points: [
            'Bulletins de notes',
            'Reçus de paiement',
            'Exports et impressions',
            'Archives de l’année',
        ],
    },
];

const TRUST_POINTS = [
    'Bulletins et reçus calqués sur les usages congolais',
    'Montants et rapports en FCFA',
    'Rôles direction, secrétariat, enseignant et caisse',
    'Hébergement et accès sécurisés pour l’équipe',
] as const;

function ProductStage({ schoolName }: { schoolName: string }) {
    return (
        <div
            aria-hidden
            className="welcome-stage pointer-events-none absolute inset-x-0 bottom-0 h-[46%] overflow-hidden md:h-[52%]"
        >
            <div className="absolute inset-x-[4%] top-6 mx-auto max-w-5xl md:top-10">
                <div className="border-border/60 bg-background/95 overflow-hidden rounded-t-[14px] border shadow-[0_-20px_60px_rgba(10,10,10,0.12)] backdrop-blur-sm">
                    <div className="border-border/50 flex items-center gap-2 border-b px-4 py-2.5">
                        <span className="bg-danger/80 size-2 rounded-full" />
                        <span className="bg-warning/80 size-2 rounded-full" />
                        <span className="bg-success/80 size-2 rounded-full" />
                        <span className="text-muted-foreground ml-2 text-[11px]">
                            {schoolName} · Tableau de bord
                        </span>
                    </div>
                    <div className="grid grid-cols-[7rem_1fr] md:grid-cols-[11rem_1fr]">
                        <aside className="border-border/50 bg-muted/40 hidden space-y-2 border-r p-3 sm:block">
                            {[
                                'Vue d’ensemble',
                                'Élèves',
                                'Emploi du temps',
                                'Bulletins',
                                'Caisse',
                            ].map((label, index) => (
                                <div
                                    key={label}
                                    className={cn(
                                        'rounded-md px-2.5 py-1.5 text-[11px]',
                                        index === 0
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {label}
                                </div>
                            ))}
                        </aside>
                        <div className="space-y-3 p-3 md:p-4">
                            <div className="grid grid-cols-3 gap-2">
                                {['Élèves', 'Présents', 'Encaissé'].map(
                                    (label, index) => (
                                        <div
                                            key={label}
                                            className="border-border/60 rounded-md border px-2.5 py-2"
                                        >
                                            <p className="text-muted-foreground text-[10px]">
                                                {label}
                                            </p>
                                            <p className="text-[15px] font-semibold tracking-tight">
                                                {
                                                    ['1 248', '96 %', '4,2 M'][
                                                        index
                                                    ]
                                                }
                                            </p>
                                        </div>
                                    ),
                                )}
                            </div>
                            <div className="border-border/60 grid h-24 grid-cols-5 gap-1 rounded-md border p-2 md:h-28">
                                {Array.from({ length: 5 }).map((_, col) => (
                                    <div
                                        key={col}
                                        className="flex flex-col gap-1"
                                    >
                                        <div className="bg-muted h-2 rounded-sm" />
                                        <div
                                            className="bg-primary/25 rounded-sm"
                                            style={{
                                                height: `${28 + ((col * 17) % 40)}%`,
                                            }}
                                        />
                                        <div className="bg-muted/80 flex-1 rounded-sm" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Welcome({ catalog }: { catalog: SchoolDataset }) {
    const { auth, name } = usePage().props;
    const brand = String(name ?? 'Yousch');
    const profile = catalog.profile;
    const primaryHref = auth.user ? dashboard() : login();
    const primaryLabel = auth.user
        ? 'Ouvrir le tableau de bord'
        : 'Connexion administration';
    const registerHref = register();

    return (
        <>
            <Head title={`${brand} : Administration scolaire`}>
                <link
                    rel="preconnect"
                    href="https://fonts.bunny.net"
                    crossOrigin=""
                />
                <link
                    href="https://fonts.bunny.net/css?family=poppins:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="welcome-saas bg-background text-foreground min-h-svh font-[family-name:var(--font-welcome)]">
                <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10">
                    <a href="#top" className="inline-flex items-center">
                        <img
                            src="/logo.png"
                            alt={brand}
                            className="h-8 w-auto object-contain md:h-9"
                        />
                    </a>
                    <nav className="text-muted-foreground hidden items-center gap-7 text-[13px] font-medium md:flex">
                        <a href="#modules" className="hover:text-foreground">
                            Modules
                        </a>
                        <a href="#parcours" className="hover:text-foreground">
                            Parcours
                        </a>
                        <a href="#offres" className="hover:text-foreground">
                            Offres
                        </a>
                        <a href="#confiance" className="hover:text-foreground">
                            Confiance
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        {!auth.user ? (
                            <Button asChild size="sm" variant="outline">
                                <Link href={registerHref}>
                                    Enregistrer un établissement
                                </Link>
                            </Button>
                        ) : null}
                        <Button asChild size="sm">
                            <Link href={primaryHref}>
                                {auth.user ? 'Tableau de bord' : 'Connexion'}
                            </Link>
                        </Button>
                    </div>
                </header>

                <main id="top">
                    <section className="welcome-hero bg-background relative isolate flex min-h-svh flex-col overflow-hidden">
                        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pt-24 pb-[48%] md:px-10 md:pb-[44%]">
                            <p className="text-foreground text-[clamp(2.75rem,8vw,5.25rem)] leading-[1.02] font-semibold tracking-tight">
                                {brand}
                            </p>
                            <h1 className="sr-only">
                                {brand} : administration scolaire
                            </h1>
                            <p className="text-foreground/80 mt-5 max-w-xl text-[16px] leading-relaxed font-medium md:text-[18px]">
                                La plateforme qui centralise scolarité,
                                pédagogie et caisse pour les établissements du
                                préscolaire au lycée.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Button size="lg" asChild>
                                    <Link href={primaryHref}>
                                        {primaryLabel}
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <a href="#modules">Voir les modules</a>
                                </Button>
                            </div>
                        </div>
                        <ProductStage schoolName={profile.name} />
                    </section>

                    <section className="border-border/60 border-y px-5 py-16 md:px-10 md:py-20">
                        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_0.85fr] md:items-center">
                            <div>
                                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                    Pensé pour la direction d’école
                                </h2>
                                <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
                                    Yousch remplace les tableurs et les
                                    dossiers papier par un outil unique : du
                                    premier jour d’inscription au bulletin de
                                    fin de trimestre. Secrétariat, enseignants
                                    et caisse partagent la même année scolaire.
                                </p>
                                <ul className="mt-6 space-y-2.5">
                                    {[
                                        'Une seule source de vérité pour classes et élèves',
                                        'Documents prêts pour les parents',
                                        'Droits d’accès selon les métiers',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2.5 text-[14px]"
                                        >
                                            <Check
                                                className="welcome-check text-primary mt-0.5 size-4 shrink-0"
                                                strokeWidth={0.25}
                                            />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="welcome-reveal mx-auto">
                                <EmptyStateIcon
                                    icon={ShieldCheck}
                                    tone="primary"
                                    className="welcome-icon-float w-[180px] opacity-90 md:w-[215px]"
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        id="modules"
                        className="scroll-mt-20 px-5 py-16 md:px-10 md:py-24"
                    >
                        <div className="mx-auto max-w-5xl">
                            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                Tout le cycle de vie scolaire
                            </h2>
                            <p className="text-muted-foreground mt-3 max-w-2xl text-[15px] leading-relaxed">
                                Six pôles connectés sur la même année, les mêmes
                                classes et les mêmes utilisateurs - pour éviter
                                les allers-retours entre outils.
                            </p>
                            <ul className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
                                {MODULES.map((module, index) => (
                                    <li
                                        key={module.title}
                                        className={cn(
                                            'welcome-reveal flex flex-col',
                                            `welcome-reveal-delay-${Math.min(index + 1, 5)}`,
                                        )}
                                    >
                                        <EmptyStateIcon
                                            icon={module.icon}
                                            tone="primary"
                                            className="welcome-icon-float mb-5 w-full max-w-[180px] opacity-90"
                                            iconClassName="size-16"
                                        />
                                        <h3 className="text-[17px] font-semibold tracking-tight">
                                            {module.title}
                                        </h3>
                                        <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
                                            {module.body}
                                        </p>
                                        <ul className="mt-4 space-y-2">
                                            {module.points.map((point) => (
                                                <li
                                                    key={point}
                                                    className="text-foreground/80 flex items-start gap-2 text-[13px]"
                                                >
                                                    <Check
                                                        className="welcome-check text-primary mt-0.5 size-3.5 shrink-0"
                                                        strokeWidth={0.25}
                                                    />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="bg-primary text-primary-foreground px-5 py-16 md:px-10 md:py-24">
                        <div className="mx-auto max-w-5xl">
                            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                Du préscolaire au lycée
                            </h2>
                            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/80">
                                Chaque cycle conserve ses classes, matières et
                                tarifs. Yousch orchestre le tout dans une
                                seule école numérique, prête pour l’année{' '}
                                {catalog.academicYears[0]?.label ?? 'en cours'}.
                            </p>
                            <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                                {catalog.cycles.map((cycle, index) => {
                                    const fee = catalog.fees.find(
                                        (item) => item.cycle === cycle.value,
                                    );

                                    return (
                                        <li
                                            key={cycle.value}
                                            className={cn(
                                                'welcome-reveal border-t border-white/25 pt-6',
                                                `welcome-reveal-delay-${Math.min(index + 1, 5)}`,
                                            )}
                                        >
                                            <EmptyStateIcon
                                                icon={GraduationCap}
                                                tone="inverse"
                                                className="welcome-icon-float mb-4 w-[140px] opacity-95"
                                                iconClassName="size-14"
                                            />
                                            <p className="text-[18px] font-semibold tracking-tight">
                                                {cycle.label}
                                            </p>
                                            <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                                                Mensualité indicative{' '}
                                                {formatFcfa(
                                                    fee?.monthlyAmount ?? 0,
                                                )}
                                                . Inscription et réinscription
                                                gérées dans le même cycle.
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </section>

                    <section
                        id="parcours"
                        className="scroll-mt-20 px-5 py-16 md:px-10 md:py-24"
                    >
                        <div className="mx-auto max-w-5xl">
                            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                En trois temps
                            </h2>
                            <p className="text-muted-foreground mt-3 max-w-2xl text-[15px]">
                                Une mise en route claire, puis un rythme de
                                travail stable jusqu’aux documents de fin
                                d’année.
                            </p>
                            <ol className="mt-14 space-y-14">
                                {STEPS.map((step, index) => (
                                    <li
                                        key={step.n}
                                        className={cn(
                                            'welcome-reveal grid items-start gap-6 md:grid-cols-[12rem_1fr] md:gap-10',
                                            `welcome-reveal-delay-${Math.min(index + 1, 5)}`,
                                        )}
                                    >
                                        <EmptyStateIcon
                                            icon={step.icon}
                                            tone="primary"
                                            className="welcome-icon-float w-[160px] opacity-90"
                                            iconClassName="size-16"
                                        />
                                        <div>
                                            <p className="text-primary text-[13px] font-semibold tracking-[0.14em] uppercase">
                                                Étape {step.n}
                                            </p>
                                            <h3 className="mt-2 text-[20px] font-semibold tracking-tight">
                                                {step.title}
                                            </h3>
                                            <p className="text-muted-foreground mt-2 max-w-xl text-[14px] leading-relaxed">
                                                {step.body}
                                            </p>
                                            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                                                {step.points.map((point) => (
                                                    <li
                                                        key={point}
                                                        className="flex items-start gap-2 text-[13px]"
                                                    >
                                                        <Check
                                                            className="welcome-check text-primary mt-0.5 size-3.5 shrink-0"
                                                            strokeWidth={0.25}
                                                        />
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section
                        id="offres"
                        className="border-border/60 scroll-mt-20 border-y px-5 py-16 md:px-10 md:py-24"
                    >
                        <div className="mx-auto max-w-5xl">
                            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                Offres d’abonnement
                            </h2>
                            <p className="text-muted-foreground mt-3 max-w-2xl text-[15px] leading-relaxed">
                                Facturation à l’école, sièges pour l’équipe.
                                Paiement mobile money ou virement. Changez
                                d’offre quand l’établissement grandit.
                            </p>
                            <ul className="mt-14 grid gap-10 md:grid-cols-3">
                                {PLAN_OFFERS.map((offer, index) => (
                                    <li
                                        key={offer.plan}
                                        className={cn(
                                            'welcome-reveal border-border flex flex-col border-t pt-6',
                                            `welcome-reveal-delay-${Math.min(index + 1, 5)}`,
                                            index === 1 && 'md:border-primary',
                                        )}
                                    >
                                        <EmptyStateIcon
                                            icon={Banknote}
                                            tone="primary"
                                            className="welcome-icon-float mb-4 w-[140px] opacity-90"
                                            iconClassName="size-14"
                                        />
                                        <p className="text-[15px] font-semibold tracking-tight">
                                            {offer.label}
                                        </p>
                                        <p className="mt-4 text-3xl font-semibold tracking-tight">
                                            {formatFcfa(offer.monthlyAmount)}
                                            <span className="text-muted-foreground text-[13px] font-medium">
                                                {' '}
                                                / mois
                                            </span>
                                        </p>
                                        <ul className="text-muted-foreground mt-4 space-y-2 text-[13px]">
                                            <li className="flex gap-2">
                                                <Check
                                                    className="welcome-check text-primary mt-0.5 size-3.5 shrink-0"
                                                    strokeWidth={0.25}
                                                />
                                                Jusqu’à {offer.seats}{' '}
                                                utilisateurs
                                            </li>
                                            <li className="flex gap-2">
                                                <Check
                                                    className="welcome-check text-primary mt-0.5 size-3.5 shrink-0"
                                                    strokeWidth={0.25}
                                                />
                                                Tous les modules scolaires
                                            </li>
                                            <li className="flex gap-2">
                                                <Check
                                                    className="welcome-check text-primary mt-0.5 size-3.5 shrink-0"
                                                    strokeWidth={0.25}
                                                />
                                                Reçus et bulletins inclus
                                            </li>
                                        </ul>
                                        <div className="mt-6">
                                            <Button
                                                variant={
                                                    index === 1
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                asChild
                                            >
                                                <Link href={registerHref}>
                                                    Choisir {offer.label}
                                                </Link>
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section
                        id="confiance"
                        className="scroll-mt-20 px-5 py-16 md:px-10 md:py-24"
                    >
                        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_0.9fr] md:items-start">
                            <div>
                                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                    Ancré au Congo
                                </h2>
                                <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
                                    Maquettes de bulletins, devises en FCFA,
                                    cycles locaux et rôles adaptés aux
                                    établissements privés et confessionnels -
                                    comme {profile.name} à {profile.city}.
                                </p>
                                <ul className="mt-6 space-y-3">
                                    {TRUST_POINTS.map((point) => (
                                        <li
                                            key={point}
                                            className="flex items-start gap-2.5 text-[14px]"
                                        >
                                            <Check
                                                className="welcome-check text-primary mt-0.5 size-4 shrink-0"
                                                strokeWidth={0.25}
                                            />
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                                <div className="text-muted-foreground mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px]">
                                    <p>
                                        Devise{' '}
                                        <strong className="text-foreground">
                                            {profile.currency}
                                        </strong>
                                    </p>
                                    <p>
                                        Pays{' '}
                                        <strong className="text-foreground">
                                            {profile.country}
                                        </strong>
                                    </p>
                                    <p>
                                        Contact{' '}
                                        <strong className="text-foreground">
                                            {profile.email}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                            <div className="welcome-reveal mx-auto">
                                <EmptyStateIcon
                                    icon={ShieldCheck}
                                    tone="primary"
                                    className="welcome-icon-float w-[200px] opacity-90"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="welcome-cta bg-muted/40 px-5 py-20 md:px-10 md:py-28">
                        <div className="welcome-reveal mx-auto flex max-w-3xl flex-col items-center text-center">
                            <EmptyStateIcon
                                icon={GraduationCap}
                                tone="primary"
                                className="welcome-icon-float mb-6 w-[160px] opacity-90"
                                iconClassName="size-16"
                            />
                            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                                Passez l’année scolaire au numérique
                            </h2>
                            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-[15px] leading-relaxed">
                                Créez l’espace de votre établissement en quelques
                                minutes, ou connectez-vous si vous avez déjà un
                                domaine Yousch.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-3">
                                {!auth.user ? (
                                    <Button size="lg" asChild>
                                        <Link href={registerHref}>
                                            Enregistrer un établissement
                                        </Link>
                                    </Button>
                                ) : null}
                                <Button
                                    size="lg"
                                    variant={auth.user ? 'default' : 'outline'}
                                    asChild
                                >
                                    <Link href={primaryHref}>
                                        {primaryLabel}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-border/60 text-muted-foreground border-t px-5 py-8 text-[12px] md:px-10">
                    <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            © {new Date().getFullYear()} {brand}. Tous droits
                            réservés.
                        </p>
                        <p>
                            {profile.name} · {profile.city}
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}

Welcome.layout = null;
