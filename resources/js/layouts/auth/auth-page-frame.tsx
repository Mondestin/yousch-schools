import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { home } from '@/routes';

export default function AuthPageFrame({ children }: { children: ReactNode }) {
    return (
        <div className="bg-muted/25 text-foreground flex min-h-svh flex-col">
            <header className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-6">
                <Link href={home()} aria-label="YouSch — Accueil" className="focus-visible:outline-primary rounded focus-visible:outline-2">
                    <img src="/logo.png" alt="YouSch" className="h-9 w-auto object-contain" />
                </Link>
            </header>
            <main className="flex flex-1 items-center justify-center px-5 py-8 sm:py-12">
                <div className="w-full max-w-[440px]">{children}</div>
            </main>
            <footer className="text-muted-foreground px-6 py-5 text-center text-[11px]">
                YouSch · Powered by{' '}
                <strong className="text-foreground/80 font-bold">Phoenone</strong>
            </footer>
        </div>
    );
}
