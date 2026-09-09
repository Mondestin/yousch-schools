import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { resolve as resolveDomain } from '@/routes/login/domain';
import { home, register } from '@/routes';

const domainSchema = z.object({
    domain: z
        .string()
        .trim()
        .min(1, 'Le domaine de l’établissement est obligatoire.')
        .regex(
            /^[a-z0-9-]+$/i,
            'Le domaine ne peut contenir que des lettres, chiffres et tirets.',
        ),
});

type Props = {
    status?: string;
};

export default function LoginDomain({ status }: Props) {
    const [domain, setDomain] = useState('');
    const { errors, clearErrors, validate } = useFieldErrors();

    return (
        <>
            <Head title="Connexion à votre établissement" />
            <div className="bg-muted/25 text-foreground flex min-h-svh flex-col">
                <header className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-6">
                    <Link
                        href={home()}
                        aria-label="YouSch — Accueil"
                        className="focus-visible:outline-primary rounded focus-visible:outline-2"
                    >
                        <img
                            src="/logo.png"
                            alt="YouSch"
                            className="h-9 w-auto object-contain"
                        />
                    </Link>
                </header>
                <main className="flex flex-1 items-center justify-center px-5 py-8 sm:py-12">
                    <div className="w-full max-w-[440px] space-y-5">
                            <ol
                                aria-label="Étapes de connexion"
                                className="mb-7 flex items-center gap-3 text-[12px]"
                            >
                                <li
                                    aria-current="step"
                                    className="text-primary flex items-center gap-2 font-medium"
                                >
                                    <span className="bg-primary/10 flex size-6 items-center justify-center rounded-full">
                                        1
                                    </span>{' '}
                                    Établissement
                                </li>
                                <li
                                    aria-hidden="true"
                                    className="bg-border h-px flex-1"
                                />
                                <li className="text-muted-foreground flex items-center gap-2">
                                    <span className="bg-muted flex size-6 items-center justify-center rounded-full">
                                        2
                                    </span>{' '}
                                    Connexion
                                </li>
                            </ol>
                        <section
                            className="bg-background border-border/80 rounded-2xl border p-6 shadow-[0_8px_32px_rgba(15,23,42,0.04)] sm:p-8"
                            aria-labelledby="login-title"
                        >
                            <h1
                                id="login-title"
                                className="text-[24px] leading-tight font-semibold tracking-tight"
                            >
                                Connexion
                            </h1>
                            <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">
                                Indiquez le domaine de votre établissement.
                            </p>
                            {status && (
                                <p
                                    role="status"
                                    className="bg-primary/5 text-primary mt-5 rounded-lg p-3 text-[13px]"
                                >
                                    {status}
                                </p>
                            )}
                            <Form
                                action={resolveDomain()}
                                noValidate
                                className="mt-7"
                                onBefore={() =>
                                    validate(domainSchema, { domain })
                                }
                            >
                                {({ processing, errors: serverErrors }) => (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="domain">
                                                Domaine de l’établissement
                                            </Label>
                                            <Input
                                                id="domain"
                                                name="domain"
                                                value={domain}
                                                onChange={(event) => {
                                                    clearErrors('domain');
                                                    setDomain(
                                                        event.target.value,
                                                    );
                                                }}
                                                autoFocus
                                                autoComplete="organization"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                placeholder="Ex. : palmiers"
                                                className="h-11 rounded-lg text-[14px]"
                                                aria-invalid={Boolean(
                                                    errors.domain ??
                                                    serverErrors.domain,
                                                )}
                                                aria-describedby={
                                                    (errors.domain ??
                                                    serverErrors.domain)
                                                        ? 'domain-error'
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                id="domain-error"
                                                role="alert"
                                                message={
                                                    errors.domain ??
                                                    serverErrors.domain
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="h-11 w-full gap-2 rounded-lg text-[13px]"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <>
                                                    <Spinner /> Recherche de
                                                    l’établissement…
                                                </>
                                            ) : (
                                                <>
                                                    Continuer{' '}
                                                    <ArrowRight
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </Form>
                        </section>
                        <section className="border-border/60 rounded-xl border px-5 py-4 text-center">
                            <Link
                                href={register()}
                                className="text-primary inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline"
                            >
                                Enregistrer un établissement{' '}
                                <ArrowRight
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                            </Link>
                        </section>
                    </div>
                </main>
                <footer className="text-muted-foreground px-6 py-5 text-center text-[11px]">
                    YouSch · Powered by{' '}
                    <strong className="text-foreground/80 font-bold">Phoenone</strong>
                </footer>
            </div>
        </>
    );
}
