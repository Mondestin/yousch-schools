import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { dashboard, login } from '@/routes';
import { COUNTRY_NAME } from '@/lib/school-rows';
import type { SchoolDataset } from '@/types/school';

export default function Welcome({ catalog }: { catalog: SchoolDataset }) {
    const { auth, name } = usePage().props;
    const profile = catalog.profile;

    return (
        <>
            <Head title={profile.name} />
            <div className="bg-background text-foreground flex min-h-svh flex-col">
                <header className="flex items-center justify-between px-6 py-5 md:px-10">
                    <Link href="/" className="flex items-center gap-2.5">
                        <img
                            src="/logo.png"
                            alt={String(name)}
                            className="h-9 w-auto object-contain"
                        />
                    </Link>
                    {auth.user ? (
                        <Button asChild>
                            <Link href={dashboard()}>Tableau de bord</Link>
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link href={login()}>Connexion</Link>
                        </Button>
                    )}
                </header>

                <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-20">
                    <p className="text-primary text-sm font-semibold tracking-widest uppercase">
                        {profile.city} · {COUNTRY_NAME}
                    </p>
                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
                        {profile.name}
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
                        {profile.motto}. Administration scolaire — du
                        préscolaire au lycée.
                    </p>
                    <p className="mt-4 text-[15px]">
                        {profile.address} · {profile.phone} · {profile.email}
                    </p>
                    <div className="mt-8">
                        {auth.user ? (
                            <Button size="lg" asChild>
                                <Link href={dashboard()}>
                                    Ouvrir le tableau de bord
                                </Link>
                            </Button>
                        ) : (
                            <Button size="lg" asChild>
                                <Link href={login()}>
                                    Connexion administration
                                </Link>
                            </Button>
                        )}
                    </div>
                    <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {catalog.cycles.map((cycle) => (
                            <li
                                key={cycle.value}
                                className="rounded-[8px] border px-4 py-3"
                            >
                                <p className="text-[15px] font-medium">
                                    {cycle.label}
                                </p>
                                <p className="text-muted-foreground text-[13px]">
                                    Frais{' '}
                                    {(
                                        catalog.fees.find(
                                            (fee) => fee.cycle === cycle.value,
                                        )?.monthlyAmount ?? 0
                                    ).toLocaleString('fr-FR')}{' '}
                                    FCFA / mois
                                </p>
                            </li>
                        ))}
                    </ul>
                    <p className="text-muted-foreground mt-10 text-[13px]">
                        Chef d’établissement : {profile.directorName} ·
                        Promoteur : {profile.promoterName}
                    </p>
                </main>
            </div>
        </>
    );
}
