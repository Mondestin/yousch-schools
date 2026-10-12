import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { dashboard, login } from '@/routes';

export default function WelcomeMaintenance({ name }: { name: string }) {
    const { auth } = usePage().props;
    const user = auth?.user ?? null;

    return (
        <>
            <Head title="Maintenance" />
            <div className="bg-muted/25 text-foreground flex min-h-svh flex-col font-sans">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-6">
                    <Link
                        href="/"
                        aria-label={`${name} — Accueil`}
                        className="focus-visible:outline-primary rounded focus-visible:outline-2"
                    >
                        <img
                            src="/logo.png"
                            alt={name}
                            className="h-9 w-auto object-contain"
                        />
                    </Link>
                </header>

                <main className="flex flex-1 items-center justify-center px-5 py-8 sm:py-12">
                    <section
                        className="bg-background border-border/80 w-full max-w-[440px] rounded-2xl border p-6 shadow-[0_8px_32px_rgba(15,23,42,0.04)] sm:p-8"
                        aria-labelledby="maintenance-title"
                    >
                        <div className="flex flex-col gap-3">
                            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase">
                                Maintenance
                            </p>
                            <h1
                                id="maintenance-title"
                                className="text-[24px] leading-tight font-semibold tracking-tight"
                            >
                                Page d’accueil indisponible
                            </h1>
                            <p className="text-muted-foreground text-[13px] leading-relaxed">
                                Nous mettons à jour la vitrine publique. La
                                connexion et l’espace établissement restent
                                entièrement disponibles.
                            </p>
                        </div>

                        <div className="mt-7">
                            {user ? (
                                <Button asChild className="h-11 w-full rounded-lg">
                                    <Link href={dashboard()}>
                                        Tableau de bord
                                    </Link>
                                </Button>
                            ) : (
                                <Button asChild className="h-11 w-full rounded-lg">
                                    <Link href={login()}>Se connecter</Link>
                                </Button>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="text-muted-foreground px-6 py-5 text-center text-[11px]">
                    {name} · Powered by{' '}
                    <strong className="text-foreground/80 font-bold">
                        Phoenone
                    </strong>
                </footer>
            </div>
        </>
    );
}

WelcomeMaintenance.layout = null;
