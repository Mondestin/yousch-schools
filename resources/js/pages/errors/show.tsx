import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { dashboard, home, login } from '@/routes';

const MESSAGES: Record<
    number,
    { title: string; description: string }
> = {
    403: {
        title: 'Accès refusé',
        description:
            'Vous n’avez pas l’autorisation d’ouvrir cette page.',
    },
    404: {
        title: 'Page introuvable',
        description:
            'Cette adresse n’existe pas, ou la ressource a été déplacée.',
    },
    419: {
        title: 'Session expirée',
        description:
            'Votre session a expiré. Rechargez la page ou reconnectez-vous.',
    },
    429: {
        title: 'Trop de requêtes',
        description:
            'Vous avez fait trop de tentatives. Réessayez dans un moment.',
    },
    500: {
        title: 'Erreur serveur',
        description:
            'Une erreur inattendue s’est produite. Réessayez plus tard.',
    },
    503: {
        title: 'Service indisponible',
        description:
            'L’application est temporairement indisponible (maintenance).',
    },
};

export default function ErrorShow({ status }: { status: number }) {
    const { auth, name } = usePage().props;
    const user = auth?.user ?? null;
    const copy = MESSAGES[status] ?? {
        title: 'Une erreur est survenue',
        description: 'Impossible d’afficher cette page pour le moment.',
    };

    return (
        <>
            <Head title={`${status} - ${copy.title}`} />
            <div className="bg-background text-foreground flex min-h-svh flex-col">
                <header className="flex items-center justify-between px-6 py-5 md:px-10">
                    <Link href="/" className="flex items-center gap-2.5">
                        <img
                            src="/logo.png"
                            alt={String(name ?? 'Yousch')}
                            className="h-9 w-auto object-contain"
                        />
                    </Link>
                </header>

                <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
                    <p className="text-primary text-[72px] leading-none font-semibold tracking-tight tabular-nums">
                        {status}
                    </p>
                    <h1 className="mt-6 text-2xl font-semibold tracking-tight">
                        {copy.title}
                    </h1>
                    <p className="text-muted-foreground mt-3 text-[15px]">
                        {copy.description}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        {user ? (
                            <Button asChild>
                                <Link href={dashboard()}>
                                    Tableau de bord
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link href={login()}>Connexion</Link>
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={home()}>Accueil</Link>
                        </Button>
                    </div>
                </main>
            </div>
        </>
    );
}

ErrorShow.layout = null;
