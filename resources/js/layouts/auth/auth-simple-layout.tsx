import AuthPageFrame from '@/layouts/auth/auth-page-frame';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <AuthPageFrame>
            <section className="bg-background border-border/80 flex flex-col gap-7 rounded-2xl border p-6 shadow-[0_8px_32px_rgba(15,23,42,0.04)] sm:p-8 [&_input:not([type=checkbox])]:h-11 [&_input]:rounded-lg [&_input]:text-[14px] [&_button[type=submit]]:min-h-11 [&_button[type=submit]]:rounded-lg" aria-labelledby="auth-title">
                <div className="flex flex-col gap-3">
                    <h1 id="auth-title" className="text-[24px] leading-tight font-semibold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground text-[13px] leading-relaxed">{description}</p>
                </div>
                {children}
            </section>
        </AuthPageFrame>
    );
}
