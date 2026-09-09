import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    Banknote,
    BookOpenCheck,
    Building2,
    CalendarDays,
    Check,
    ChevronDown,
    ClipboardCheck,
    GraduationCap,
    LayoutDashboard,
    Menu,
    School,
    Smartphone,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatFcfa } from '@/lib/school-rows';
import { PLAN_OFFERS } from '@/lib/school-subscription';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

const navigation = [
    ['La plateforme', '#plateforme'],
    ['Fonctionnalités', '#modules'],
    ['Tarifs', '#offres'],
    ['Questions', '#questions'],
] as const;

const modules = [
    {
        icon: Users,
        category: 'Élèves & familles',
        title: 'Un dossier. Toute une scolarité.',
        body: 'Inscriptions, réinscriptions, tuteurs et pièces jointes. Retrouvez les informations de chaque élève au même endroit.',
        color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    },
    {
        icon: BookOpenCheck,
        category: 'Notes & bulletins',
        title: 'La pédagogie, bien organisée.',
        body: 'Centralisez les évaluations, suivez les moyennes et préparez les bulletins à remettre aux familles.',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    },
    {
        icon: Banknote,
        category: 'Scolarité & caisse',
        title: 'Des finances plus lisibles.',
        body: 'Tarifs par cycle, encaissements, arriérés et reçus : gardez une vue claire sur la scolarité et les mouvements de caisse.',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
        icon: CalendarDays,
        category: 'Emploi du temps',
        title: 'Chaque cours à sa place.',
        body: 'Organisez les créneaux, les salles et les affectations des enseignants dans une grille hebdomadaire.',
        color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    },
    {
        icon: ClipboardCheck,
        category: 'Présences',
        title: 'Ne perdez plus le fil.',
        body: 'Consignez les présences, absences et retards. Consultez l’historique pour un suivi régulier de chaque élève.',
        color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    },
    {
        icon: Building2,
        category: 'Organisation',
        title: 'Votre école, votre structure.',
        body: 'Configurez les années scolaires, cycles, classes et utilisateurs selon le fonctionnement de votre établissement.',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    },
];

const teams = [
    {
        name: 'Direction',
        title: 'Prenez du recul. Gardez le contrôle.',
        body: 'Effectifs, assiduité et recouvrement réunis dans une vue d’ensemble pour suivre l’activité de votre établissement.',
        points: [
            'Indicateurs par cycle',
            'Suivi des effectifs et de la scolarité',
            'Organisation des équipes',
        ],
        icon: LayoutDashboard,
    },
    {
        name: 'Secrétariat',
        title: 'Un accueil organisé, des dossiers à jour.',
        body: 'Retrouvez les élèves, leurs responsables et les documents utiles sans multiplier les fichiers.',
        points: [
            'Admissions et réinscriptions',
            'Coordonnées des familles',
            'Documents et dossiers élèves',
        ],
        icon: Users,
    },
    {
        name: 'Enseignants',
        title: 'Le suivi pédagogique à portée de main.',
        body: 'Consultez les classes et les emplois du temps, renseignez les notes et suivez les présences.',
        points: [
            'Classes et affectations',
            'Évaluations et bulletins',
            'Appel et suivi des absences',
        ],
        icon: BookOpenCheck,
    },
    {
        name: 'Caisse',
        title: 'Chaque paiement trouve sa place.',
        body: 'Suivez les échéances, enregistrez les encaissements et retrouvez les reçus dans un espace dédié.',
        points: [
            'Tarifs et échéances',
            'Encaissements et reçus',
            'Suivi des montants restant dus',
        ],
        icon: Banknote,
    },
];

const questions = [
    [
        'À quels établissements s’adresse YouSch ?',
        'YouSch accompagne les établissements du préscolaire au lycée. Les cycles, classes, matières et tarifs permettent d’organiser les différents niveaux dans un même espace.',
    ],
    [
        'Comment créer l’espace de mon établissement ?',
        'Renseignez votre établissement et son domaine, créez le compte administrateur, puis définissez votre mot de passe. Vous pourrez ensuite configurer votre organisation.',
    ],
    [
        'Comment mon équipe se connecte-t-elle ?',
        'Chaque établissement possède un domaine de connexion. Vos collaborateurs renseignent ce domaine, puis se connectent avec leur adresse e-mail et leur mot de passe. Les accès dépendent de leur rôle.',
    ],
    [
        'Les montants sont-ils affichés en FCFA ?',
        'Oui. Les tarifs de scolarité, encaissements et offres présentés ici sont en FCFA. La gestion de la caisse et des reçus fait partie de la plateforme.',
    ],
    [
        'Puis-je utiliser YouSch depuis mon téléphone ?',
        'L’interface s’adapte aux téléphones, tablettes et ordinateurs. Une connexion Internet est nécessaire pour accéder aux données et enregistrer vos modifications.',
    ],
    [
        'Puis-je faire évoluer mon abonnement ?',
        'Les offres correspondent à différentes tailles d’équipe. Retrouvez votre formule et les options de changement dans Organisation, puis Abonnement.',
    ],
] as const;

const sectionClass = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const actionClass = 'h-12 gap-2 rounded-xl px-5 text-sm';
const eyebrowClass =
    'text-xs font-semibold tracking-[0.16em] text-primary uppercase';

function ProductPreview() {
    return (
        <figure className="border-border/80 bg-background relative rounded-2xl border p-2 shadow-[0_24px_80px_-32px_rgba(55,30,95,0.3)] sm:rounded-3xl sm:p-3">
            <figcaption className="text-muted-foreground flex items-center justify-between gap-3 px-3 py-3 text-[10px] sm:text-[11px]">
                <span className="flex items-center gap-1.5" aria-hidden="true">
                    <i className="size-2 rounded-full bg-rose-300" />
                    <i className="size-2 rounded-full bg-amber-300" />
                    <i className="size-2 rounded-full bg-emerald-300" />
                </span>
                Aperçu de la plateforme · données illustratives
            </figcaption>
            <div className="border-border/70 grid overflow-hidden rounded-xl border sm:grid-cols-[140px_1fr] lg:grid-cols-[180px_1fr]">
                <aside
                    className="border-border/70 bg-muted/30 hidden flex-col gap-5 border-r p-4 sm:flex"
                    aria-hidden="true"
                >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                        <School className="text-primary size-5" />
                        Mon établissement
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {[
                            'Tableau de bord',
                            'Élèves',
                            'Enseignants',
                            'Pédagogie',
                            'Scolarité & caisse',
                            'Organisation',
                        ].map((item, index) => (
                            <div
                                key={item}
                                className={cn(
                                    'rounded-lg px-2 py-2 text-[10px]',
                                    index === 0
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                    <div className="border-border text-muted-foreground mt-auto rounded-lg border p-3 text-[10px] leading-relaxed">
                        Une équipe.
                        <br />
                        Un espace partagé.
                    </div>
                </aside>
                <div className="bg-background flex min-w-0 flex-col gap-5 p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-base font-semibold sm:text-lg">
                                Votre école, en un regard.
                            </p>
                            <p className="text-muted-foreground mt-1 text-[11px]">
                                Tableau de bord de l’établissement
                            </p>
                        </div>
                        <span className="border-border text-muted-foreground hidden rounded-md border px-2 py-1 text-[10px] md:block">
                            Tous les cycles
                        </span>
                    </div>
                    <div className="divide-border border-border grid grid-cols-3 divide-x rounded-xl border">
                        {[
                            ['248', 'Élèves inscrits'],
                            ['96 %', 'Présence du jour'],
                            ['82 %', 'Recouvrement'],
                        ].map(([value, label]) => (
                            <div key={label} className="p-3 sm:p-4">
                                <p className="text-lg font-semibold tracking-tight sm:text-2xl">
                                    {value}
                                </p>
                                <p className="text-muted-foreground mt-1 text-[10px] sm:text-[11px]">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                        <div className="border-border rounded-xl border p-4">
                            <p className="text-xs font-medium">
                                Recouvrement par cycle
                            </p>
                            <div
                                className="border-border mt-5 flex h-28 items-end justify-between gap-3 border-b"
                                aria-hidden="true"
                            >
                                {[40, 65, 92, 74, 57].map((height, index) => (
                                    <div
                                        key={index}
                                        className="bg-primary/20 relative w-full overflow-hidden rounded-t-md"
                                        style={{ height: height + '%' }}
                                    >
                                        <div className="bg-primary absolute inset-x-0 bottom-0 h-3/4 rounded-t-md" />
                                    </div>
                                ))}
                            </div>
                            <div className="text-muted-foreground mt-3 flex justify-between gap-1 text-[9px]">
                                {[
                                    'Préscolaire',
                                    'Primaire',
                                    'Collège',
                                    'Lycée',
                                    'Technique',
                                ].map((label) => (
                                    <span key={label}>{label}</span>
                                ))}
                            </div>
                        </div>
                        <div className="border-border rounded-xl border p-4">
                            <p className="text-xs font-medium">
                                Le quotidien, bien suivi
                            </p>
                            <div className="mt-4 flex flex-col gap-4">
                                {[
                                    ['Appel du matin', 'Présences renseignées'],
                                    ['Scolarité', 'Encaissements enregistrés'],
                                    ['Pédagogie', 'Bulletins en préparation'],
                                ].map(([title, subtitle]) => (
                                    <div
                                        key={title}
                                        className="flex items-center gap-2.5"
                                    >
                                        <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full">
                                            <Check
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="text-[11px] font-medium">
                                                {title}
                                            </p>
                                            <p className="text-muted-foreground text-[10px]">
                                                {subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </figure>
    );
}

export default function Welcome() {
    const { auth } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTeam, setActiveTeam] = useState(0);
    const [annual, setAnnual] = useState(false);
    const team = teams[activeTeam]!;
    const destination = auth.user ? dashboard() : register();
    const destinationLabel = auth.user
        ? 'Ouvrir mon espace'
        : 'Créer mon établissement';

    return (
        <>
            <Head title="YouSch — Votre école, simplement mieux organisée">
                <meta
                    name="description"
                    content="Centralisez inscriptions, notes, présences et scolarité avec YouSch. Une plateforme de gestion scolaire du préscolaire au lycée, pensée pour vos équipes."
                />
                <meta
                    property="og:title"
                    content="YouSch — Votre école, simplement mieux organisée"
                />
                <meta
                    property="og:description"
                    content="Moins de gestion. Plus d’éducation. Découvrez votre nouvel espace de gestion scolaire."
                />
                <meta property="og:type" content="website" />
            </Head>
            <div className="text-foreground selection:bg-primary/15 dark:bg-background [&_a]:focus-visible:outline-primary min-h-svh bg-[#fcfbf8] [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4">
                <a
                    href="#contenu"
                    className="bg-background sr-only fixed top-4 left-4 z-50 rounded-lg p-3 focus:not-sr-only"
                >
                    Aller au contenu
                </a>
                <header className="border-border/50 dark:bg-background/95 sticky top-0 z-40 border-b bg-[#fcfbf8]/95 backdrop-blur-xl">
                    <div
                        className={cn(
                            sectionClass,
                            'flex h-20 items-center justify-between gap-5',
                        )}
                    >
                        <a href="#contenu" aria-label="YouSch — Accueil">
                            <img
                                src="/logo.png"
                                alt="YouSch"
                                width="128"
                                height="48"
                                className="h-9 w-auto"
                            />
                        </a>
                        <nav
                            aria-label="Navigation principale"
                            className="text-muted-foreground hidden items-center gap-7 text-[13px] lg:flex"
                        >
                            {navigation.map(([label, href]) => (
                                <a
                                    key={href}
                                    href={href}
                                    className="hover:text-primary transition-colors"
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>
                        <div className="flex items-center gap-3">
                            <Link
                                href={auth.user ? dashboard() : login()}
                                className="hidden text-[13px] font-medium sm:block"
                            >
                                {auth.user ? 'Mon espace' : 'Se connecter'}
                            </Link>
                            <Button
                                asChild
                                className="h-10 rounded-xl px-4 text-[13px]"
                            >
                                <Link href={destination}>
                                    {auth.user
                                        ? 'Tableau de bord'
                                        : 'Commencer'}
                                    <ArrowUpRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                aria-label={
                                    menuOpen
                                        ? 'Fermer le menu'
                                        : 'Ouvrir le menu'
                                }
                                aria-expanded={menuOpen}
                                aria-controls="mobile-navigation"
                                onClick={() => setMenuOpen(!menuOpen)}
                            >
                                {menuOpen ? <X /> : <Menu />}
                            </Button>
                        </div>
                    </div>
                    {menuOpen && (
                        <nav
                            id="mobile-navigation"
                            aria-label="Navigation mobile"
                            className="border-border bg-background flex flex-col gap-1 border-t p-5 lg:hidden"
                        >
                            {navigation.map(([label, href]) => (
                                <a
                                    key={href}
                                    href={href}
                                    onClick={() => setMenuOpen(false)}
                                    className="hover:bg-muted rounded-lg px-3 py-3 text-sm"
                                >
                                    {label}
                                </a>
                            ))}
                            <Link
                                href={auth.user ? dashboard() : login()}
                                className="text-primary px-3 py-3 text-sm"
                            >
                                {auth.user ? 'Mon espace' : 'Se connecter'}
                            </Link>
                        </nav>
                    )}
                </header>

                <main id="contenu" className="scroll-mt-24">
                    <section
                        className={cn(
                            sectionClass,
                            'relative grid items-center gap-12 pt-14 pb-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14 lg:pt-24 lg:pb-24',
                        )}
                    >
                        <div className="flex flex-col items-start gap-7">
                            <p className="border-primary/15 bg-primary/5 text-primary flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide sm:text-[11px]">
                                <span className="bg-primary size-1.5 rounded-full" />{' '}
                                L’ESPACE DE VIE DE VOTRE ÉCOLE
                            </p>
                            <h1 className="max-w-xl text-[clamp(2.75rem,5.5vw,4.6rem)] leading-[1.04] font-semibold tracking-[-0.055em]">
                                Moins de gestion.
                                <br />
                                <span className="text-primary">
                                    Plus d’éducation.
                                </span>
                            </h1>
                            <p className="text-muted-foreground max-w-md text-base leading-relaxed sm:text-lg">
                                Une école, mille choses à penser. YouSch
                                rassemble vos élèves, vos équipes et votre
                                scolarité dans un espace simple et organisé.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button asChild className={actionClass}>
                                    <Link href={destination}>
                                        {destinationLabel}
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className={cn(
                                        actionClass,
                                        'bg-transparent',
                                    )}
                                >
                                    <a href="#plateforme">
                                        Explorer la plateforme
                                        <ArrowDown aria-hidden="true" />
                                    </a>
                                </Button>
                            </div>
                            <p className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <Check
                                        className="text-primary size-3.5"
                                        aria-hidden="true"
                                    />
                                    Du préscolaire au lycée
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check
                                        className="text-primary size-3.5"
                                        aria-hidden="true"
                                    />
                                    Pensé pour vos équipes
                                </span>
                            </p>
                        </div>
                        <div className="relative isolate mx-auto w-full max-w-md py-6">
                            <div
                                aria-hidden="true"
                                className="dark:bg-primary/15 absolute inset-2 -z-10 rotate-3 rounded-[2rem] bg-[#eae2f7]"
                            />
                            <div className="border-border/80 bg-background flex flex-col gap-6 rounded-[1.75rem] border p-6 shadow-[0_20px_70px_-35px_rgba(60,30,100,0.35)] sm:p-8">
                                <div className="flex items-center gap-3">
                                    <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
                                        <School aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold">
                                            Mon établissement
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            Tout commence ici.
                                        </p>
                                    </div>
                                    <span
                                        className="ml-auto size-2 rounded-full bg-emerald-500"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        {
                                            icon: Users,
                                            label: 'Mes élèves',
                                            color: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
                                        },
                                        {
                                            icon: BookOpenCheck,
                                            label: 'La pédagogie',
                                            color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
                                        },
                                        {
                                            icon: Banknote,
                                            label: 'La scolarité',
                                            color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                                        },
                                        {
                                            icon: CalendarDays,
                                            label: 'Le quotidien',
                                            color: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className={cn(
                                                'flex flex-col items-start gap-5 rounded-2xl p-5',
                                                item.color,
                                            )}
                                        >
                                            <item.icon
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                            <span className="text-[13px] font-medium">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-border flex items-center gap-3 rounded-xl border px-4 py-3">
                                    <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full">
                                        <Check
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <p className="text-muted-foreground text-xs">
                                        Une équipe. Une information partagée.
                                    </p>
                                </div>
                            </div>
                            <div className="border-border bg-background relative -mt-2 ml-7 flex w-fit items-center gap-3 rounded-xl border px-4 py-3 shadow-lg">
                                <GraduationCap
                                    className="text-primary size-5"
                                    aria-hidden="true"
                                />
                                <span className="text-xs font-medium">
                                    L’essentiel reste l’apprentissage.
                                </span>
                            </div>
                        </div>
                    </section>

                    <div className="border-border/70 border-y">
                        <div
                            className={cn(
                                sectionClass,
                                'flex flex-col items-center gap-6 py-7 lg:flex-row lg:justify-between',
                            )}
                        >
                            <p className="text-muted-foreground text-[11px] font-medium">
                                UN ESPACE POUR CHAQUE CYCLE
                            </p>
                            <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
                                {[
                                    'Préscolaire',
                                    'Primaire',
                                    'Collège',
                                    'Lycée général',
                                    'Lycée technique',
                                ].map((cycle) => (
                                    <span
                                        key={cycle}
                                        className="flex items-center gap-2 text-[13px] font-medium"
                                    >
                                        <GraduationCap
                                            className="text-primary/60 size-4"
                                            aria-hidden="true"
                                        />
                                        {cycle}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <section
                        id="plateforme"
                        className={cn(
                            sectionClass,
                            'scroll-mt-24 py-20 sm:py-28',
                        )}
                    >
                        <div className="mx-auto mb-12 flex max-w-2xl flex-col gap-4 text-center">
                            <p className={eyebrowClass}>
                                Une vue claire. Enfin.
                            </p>
                            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                                Votre école dans son ensemble.
                                <br />
                                <span className="text-muted-foreground">
                                    Et dans les moindres détails.
                                </span>
                            </h2>
                            <p className="text-muted-foreground text-base leading-relaxed">
                                Les informations circulent entre vos services.
                                Vous gardez le cap sur ce qui compte, de
                                l’inscription au dernier bulletin.
                            </p>
                        </div>
                        <ProductPreview />
                    </section>

                    <section
                        id="modules"
                        className="border-border/60 bg-background scroll-mt-24 border-y py-20 sm:py-28"
                    >
                        <div className={sectionClass}>
                            <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                                <div className="max-w-xl">
                                    <p className={cn(eyebrowClass, 'mb-4')}>
                                        Tout se retrouve ici
                                    </p>
                                    <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                                        Un quotidien plus fluide.
                                        <br />À tous les niveaux.
                                    </h2>
                                </div>
                                <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                                    Six espaces complémentaires, une même
                                    organisation. Chaque information trouve sa
                                    place.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {modules.map((module) => (
                                    <article
                                        key={module.category}
                                        className="border-border/70 hover:border-primary/30 dark:bg-muted/20 flex flex-col gap-5 rounded-2xl border bg-[#fcfbf8] p-7 transition-colors"
                                    >
                                        <div
                                            className={cn(
                                                'flex size-11 items-center justify-center rounded-xl',
                                                module.color,
                                            )}
                                        >
                                            <module.icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
                                                {module.category}
                                            </p>
                                            <h3 className="text-lg font-semibold tracking-tight">
                                                {module.title}
                                            </h3>
                                            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                                                {module.body}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className={cn(sectionClass, 'py-20 sm:py-28')}>
                        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
                            <div>
                                <p className={cn(eyebrowClass, 'mb-4')}>
                                    Chacun son rôle. Ensemble, plus loin.
                                </p>
                                <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                                    Une plateforme.
                                    <br />
                                    Toute votre équipe.
                                </h2>
                                <p className="text-muted-foreground mt-5 text-base leading-relaxed">
                                    Du bureau de la direction à la salle de
                                    classe, chaque métier dispose d’un espace
                                    pour avancer.
                                </p>
                                <div
                                    className="mt-8 flex flex-wrap gap-2"
                                    role="group"
                                    aria-label="Découvrir les espaces par métier"
                                >
                                    {teams.map((item, index) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            aria-pressed={activeTeam === index}
                                            onClick={() => setActiveTeam(index)}
                                            className={cn(
                                                'focus-visible:outline-primary rounded-full border px-4 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2',
                                                activeTeam === index
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background hover:border-primary/40',
                                            )}
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div
                                aria-live="polite"
                                className="border-primary/15 bg-primary/5 flex flex-col justify-center gap-6 rounded-3xl border p-7 sm:p-10"
                            >
                                <team.icon
                                    className="text-primary size-9"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="text-primary mb-2 text-xs font-medium">
                                        Espace {team.name.toLowerCase()}
                                    </p>
                                    <h3 className="text-2xl font-semibold tracking-tight">
                                        {team.title}
                                    </h3>
                                    <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                                        {team.body}
                                    </p>
                                </div>
                                <ul className="flex flex-col gap-3">
                                    {team.points.map((point) => (
                                        <li
                                            key={point}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full">
                                                <Check
                                                    className="size-3"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section
                        id="parcours"
                        className="scroll-mt-24 bg-[#211532] py-20 text-white sm:py-24"
                    >
                        <div className={sectionClass}>
                            <div className="max-w-xl">
                                <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-violet-300 uppercase">
                                    De la première connexion à la rentrée
                                </p>
                                <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                                    Un nouveau départ.
                                    <br />
                                    Pas une nouvelle complication.
                                </h2>
                            </div>
                            <ol className="mt-14 grid gap-10 md:grid-cols-3">
                                {[
                                    {
                                        title: 'Créez votre espace',
                                        body: 'Renseignez votre école, choisissez son domaine et créez le compte administrateur.',
                                    },
                                    {
                                        title: 'Organisez votre école',
                                        body: 'Configurez les cycles, les classes et les tarifs. Ajoutez les utilisateurs de votre équipe.',
                                    },
                                    {
                                        title: 'Faites vivre la rentrée',
                                        body: 'Inscrivez vos élèves, préparez les cours et suivez la scolarité au même endroit.',
                                    },
                                ].map((step, index) => (
                                    <li
                                        key={step.title}
                                        className="border-t border-white/20 pt-6"
                                    >
                                        <span className="text-sm text-violet-300">
                                            0{index + 1}
                                        </span>
                                        <h3 className="mt-5 text-xl font-medium">
                                            {step.title}
                                        </h3>
                                        <p className="mt-3 text-sm leading-relaxed text-white/65">
                                            {step.body}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section
                        id="offres"
                        className={cn(
                            sectionClass,
                            'scroll-mt-24 py-20 sm:py-28',
                        )}
                    >
                        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
                            <p className={eyebrowClass}>
                                De la place pour grandir
                            </p>
                            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                                À chaque équipe,
                                <br />
                                sa formule.
                            </h2>
                            <p className="text-muted-foreground text-base">
                                Un abonnement pour votre établissement,
                                dimensionné pour les personnes qui le font
                                vivre.
                            </p>
                            <div
                                role="group"
                                aria-label="Période de facturation"
                                className="border-border bg-background mt-2 inline-flex rounded-full border p-1"
                            >
                                {[false, true].map((value) => (
                                    <button
                                        key={String(value)}
                                        type="button"
                                        aria-pressed={annual === value}
                                        onClick={() => setAnnual(value)}
                                        className={cn(
                                            'focus-visible:outline-primary rounded-full px-4 py-2.5 text-[12px] font-medium focus-visible:outline-2 sm:text-[13px]',
                                            annual === value
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {value
                                            ? 'Annuel · 2 mois offerts'
                                            : 'Mensuel'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-12 grid gap-5 lg:grid-cols-3">
                            {PLAN_OFFERS.map((offer, index) => (
                                <article
                                    key={offer.plan}
                                    className={cn(
                                        'bg-background relative flex flex-col rounded-2xl border p-7',
                                        index === 1
                                            ? 'border-primary shadow-[0_12px_40px_-20px_rgba(100,37,208,0.4)]'
                                            : 'border-border',
                                    )}
                                >
                                    {index === 1 && (
                                        <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide uppercase">
                                            Primaire et collège
                                        </span>
                                    )}
                                    <h3 className="text-xl font-semibold">
                                        {offer.label}
                                    </h3>
                                    <p className="text-muted-foreground mt-2 text-sm">
                                        {offer.summary}
                                    </p>
                                    <div className="my-7">
                                        <p className="text-3xl font-semibold tracking-tight">
                                            {formatFcfa(
                                                offer.monthlyAmount *
                                                    (annual ? 10 : 1),
                                            )}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            par établissement /{' '}
                                            {annual ? 'an' : 'mois'}
                                        </p>
                                    </div>
                                    <ul className="mb-8 flex flex-col gap-3 text-sm">
                                        {[
                                            offer.cycles,
                                            'Jusqu’à ' +
                                                offer.seats +
                                                ' utilisateurs',
                                            'Notes, présences et bulletins',
                                            'Scolarité, caisse et reçus',
                                        ].map((point) => (
                                            <li
                                                key={point}
                                                className="flex items-start gap-2"
                                            >
                                                <Check
                                                    className="text-primary mt-0.5 size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        asChild
                                        variant={
                                            index === 1 ? 'default' : 'outline'
                                        }
                                        className={cn(
                                            actionClass,
                                            'mt-auto w-full',
                                        )}
                                    >
                                        <Link href={destination}>
                                            {auth.user
                                                ? 'Ouvrir mon espace'
                                                : 'Créer mon établissement'}
                                            <ArrowRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                </article>
                            ))}
                        </div>
                        <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
                            Tarifs affichés en FCFA. La formule se configure
                            dans l’espace Abonnement de votre établissement.
                        </p>
                    </section>

                    <section
                        id="questions"
                        className="border-border/60 bg-background scroll-mt-24 border-y py-20 sm:py-24"
                    >
                        <div
                            className={cn(
                                sectionClass,
                                'grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20',
                            )}
                        >
                            <div>
                                <p className={cn(eyebrowClass, 'mb-4')}>
                                    Tout simplement
                                </p>
                                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Les réponses à<br />
                                    vos premières questions.
                                </h2>
                                <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
                                    L’essentiel pour prendre vos repères avant
                                    de commencer.
                                </p>
                            </div>
                            <div>
                                {questions.map(([question, answer]) => (
                                    <details
                                        key={question}
                                        className="group border-border border-b first:border-t"
                                    >
                                        <summary className="focus-visible:outline-primary flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-medium focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
                                            {question}
                                            <ChevronDown
                                                className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                                                aria-hidden="true"
                                            />
                                        </summary>
                                        <p className="text-muted-foreground max-w-xl pr-6 pb-6 text-sm leading-relaxed">
                                            {answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="bg-primary text-primary-foreground relative w-full overflow-hidden py-16 sm:py-24">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-32 -right-20 size-80 rounded-full border-[50px] border-white/5"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-36 -left-24 size-96 rounded-full border-[60px] border-white/5"
                        />
                        <div
                            className={cn(
                                sectionClass,
                                'relative flex max-w-3xl flex-col items-center gap-6 text-center',
                            )}
                        >
                            <School
                                className="size-9 text-white/80"
                                aria-hidden="true"
                            />
                            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                                La prochaine page de votre école commence ici.
                            </h2>
                            <p className="max-w-lg text-base leading-relaxed text-white/80">
                                Donnez à vos équipes un espace commun. Et à
                                l’éducation, toute la place qu’elle mérite.
                                Disponible aussi sur mobile.
                            </p>
                            <Button
                                asChild
                                className={cn(
                                    actionClass,
                                    'mt-1 bg-white text-foreground hover:bg-white/90',
                                )}
                            >
                                <Link href={destination}>
                                    {destinationLabel}
                                    <ArrowUpRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <div className="mt-4 flex flex-col items-center gap-4">
                                <p className="flex items-center gap-2 text-sm text-white/75">
                                    <Smartphone
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Application mobile YouSch
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <a
                                        href="#app"
                                        className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-4 text-left text-white transition-colors hover:bg-white/15"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.7Zm-2-5.8c.6-.7 1-1.7.9-2.7-1 .1-2.1.6-2.7 1.4-.6.7-1.1 1.7-.9 2.7 1 0 2-.6 2.7-1.4Z"
                                            />
                                        </svg>
                                        <span className="flex flex-col leading-tight">
                                            <span className="text-[10px] text-white/70">
                                                Télécharger sur
                                            </span>
                                            <span className="text-sm font-medium">
                                                App Store
                                            </span>
                                        </span>
                                    </a>
                                    <a
                                        href="#app"
                                        className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-4 text-left text-white transition-colors hover:bg-white/15"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M3.6 2.3c-.3.2-.6.6-.6 1.1v17.2c0 .5.3.9.6 1.1l9.9-9.7L3.6 2.3Zm1.9-.9 10.3 5.9-2.4 2.3L5.5 1.4Zm12.4 7.1 2.4 1.4c.9.5.9 1.4 0 1.9l-2.5 1.4-2.7-2.6 2.8-2.1ZM5.5 22.6l8.1-8.1 2.4 2.3-10.5 5.8Z"
                                            />
                                        </svg>
                                        <span className="flex flex-col leading-tight">
                                            <span className="text-[10px] text-white/70">
                                                Disponible sur
                                            </span>
                                            <span className="text-sm font-medium">
                                                Google Play
                                            </span>
                                        </span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-border bg-muted/40 border-t">
                    <div
                        className={cn(
                            sectionClass,
                            'grid gap-12 py-14 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))] md:gap-10 lg:gap-16',
                        )}
                    >
                        <div className="max-w-sm">
                            <a href="#contenu" aria-label="YouSch — Accueil">
                                <img
                                    src="/logo.png"
                                    alt="YouSch"
                                    width="128"
                                    height="48"
                                    className="h-9 w-auto"
                                />
                            </a>
                            <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
                                L’école avance. Son organisation aussi. YouSch
                                rassemble le quotidien de votre établissement
                                dans un espace simple.
                            </p>
                            <Button
                                asChild
                                variant="outline"
                                className={cn(actionClass, 'mt-6 bg-background')}
                            >
                                <Link href={destination}>
                                    {destinationLabel}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        <div>
                            <p className="text-foreground mb-5 text-sm font-medium">
                                La plateforme
                            </p>
                            <nav
                                aria-label="Liens du pied de page"
                                className="text-muted-foreground flex flex-col items-start gap-3.5 text-sm"
                            >
                                {navigation.map(([label, href]) => (
                                    <a
                                        key={href}
                                        href={href}
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {label}
                                    </a>
                                ))}
                            </nav>
                        </div>
                        <div>
                            <p className="text-foreground mb-5 text-sm font-medium">
                                Votre établissement
                            </p>
                            <div className="text-muted-foreground flex flex-col items-start gap-3.5 text-sm">
                                <Link
                                    href={login()}
                                    className="hover:text-foreground transition-colors"
                                >
                                    Se connecter
                                </Link>
                                <Link
                                    href={destination}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {destinationLabel}
                                </Link>
                                <a
                                    href="#parcours"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Comment démarrer
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="border-border border-t">
                        <div
                            className={cn(
                                sectionClass,
                                'text-muted-foreground flex flex-col gap-3 py-5 text-[12px] sm:flex-row sm:items-center sm:justify-between',
                            )}
                        >
                            <p>
                                © {new Date().getFullYear()} YouSch. Tous
                                droits réservés.
                            </p>
                            <p>
                                Powered by{' '}
                                <span className="text-foreground font-medium">
                                    Phoenone
                                </span>
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}

Welcome.layout = null;
