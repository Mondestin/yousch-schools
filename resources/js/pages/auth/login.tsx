import { Form, Head, Link } from '@inertiajs/react';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFieldErrors } from '@/hooks/use-field-errors';
import AuthPageFrame from '@/layouts/auth/auth-page-frame';
import { login as loginEntry } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'L’adresse e-mail est obligatoire.')
        .email('L’adresse e-mail n’est pas valide.'),
    password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

type Props = {
    status?: string;
    canResetPassword: boolean;
    email?: string | null;
    school: {
        id: string;
        name: string;
        domain: string;
        logoUrl: string | null;
    };
};

function schoolInitials(name: string): string {
    const parts = name
        .split(/\s+/)
        .map((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, ''))
        .filter(Boolean);

    if (parts.length === 0) {
        return 'É';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function Login({
    status,
    canResetPassword,
    email: initialEmail = null,
    school,
}: Props) {
    const [email, setEmail] = useState(initialEmail ?? '');
    const [password, setPassword] = useState('');
    const { errors, clearErrors, validate } = useFieldErrors();
    const initials = schoolInitials(school.name);

    return (
        <>
            <Head title={`Connexion · ${school.name}`} />

            <AuthPageFrame>
                    <ol aria-label="Étapes de connexion" className="mb-7 flex items-center gap-3 text-[12px]">
                        <li className="text-muted-foreground flex items-center gap-2">
                            <span className="bg-muted flex size-6 items-center justify-center rounded-full">1</span>
                            Établissement
                        </li>
                        <li aria-hidden="true" className="bg-border h-px flex-1" />
                        <li aria-current="step" className="text-primary flex items-center gap-2 font-medium">
                            <span className="bg-primary/10 flex size-6 items-center justify-center rounded-full">2</span>
                            Connexion
                        </li>
                    </ol>
                <section className="bg-background border-border/80 rounded-2xl border p-6 shadow-[0_8px_32px_rgba(15,23,42,0.04)] sm:p-8 [&_input]:h-11 [&_input]:rounded-lg [&_input]:text-[14px]" aria-labelledby="school-login-title">
                    <div className="flex flex-col items-start">
                        {school.logoUrl ? (
                            <img
                                src={school.logoUrl}
                                alt=""
                                className="h-14 w-auto max-w-[10rem] object-contain"
                            />
                        ) : (
                            <div
                                aria-hidden
                                className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl text-[18px] font-semibold tracking-tight"
                            >
                                {initials}
                            </div>
                        )}

                        <h1 id="school-login-title" className="mt-4 text-[24px] leading-tight font-semibold tracking-tight">
                            {school.name}
                        </h1>
                        <p className="text-muted-foreground mt-1.5 text-[13px]">
                            Connectez-vous à votre espace avec vos identifiants.
                        </p>
                    </div>

                    <Form
                        action={store()}
                        resetOnSuccess={['password']}
                        noValidate
                        className="mt-7 flex flex-col gap-6"
                        onBefore={() =>
                            validate(loginSchema, { email, password })
                        }
                        onSuccess={() => setPassword('')}
                    >
                        {({ processing, errors: serverErrors }) => (
                            <>
                                <div className="grid gap-5">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">
                                            Adresse e-mail
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={(event) => {
                                                clearErrors('email');
                                                setEmail(event.target.value);
                                            }}
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="username"
                                            placeholder="prenom.nom@ecole.cg"
                                            aria-invalid={Boolean(
                                                errors.email ??
                                                serverErrors.email,
                                            )}
                                        />
                                        <InputError
                                            message={
                                                errors.email ??
                                                serverErrors.email
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            Mot de passe
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            value={password}
                                            onChange={(event) => {
                                                clearErrors('password');
                                                setPassword(event.target.value);
                                            }}
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder="Mot de passe"
                                            aria-invalid={Boolean(
                                                errors.password ??
                                                serverErrors.password,
                                            )}
                                        />
                                        <InputError
                                            message={
                                                errors.password ??
                                                serverErrors.password
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={3}
                                        />
                                        <Label
                                            htmlFor="remember"
                                            className="text-muted-foreground font-normal"
                                        >
                                            Se souvenir de moi
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="h-11 w-full gap-2 rounded-lg text-[13px]"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                    >
                                        {processing ? <Spinner /> : <LogIn aria-hidden="true" className="size-4" />}
                                        {processing ? 'Connexion…' : 'Accéder au portail'}
                                    </Button>
                                </div>

                                <div className="flex items-start justify-between gap-3 text-[12px] sm:text-[13px]">
                                    {canResetPassword && (
                                        <Link
                                            href={request()}
                                            className="text-muted-foreground hover:text-primary focus-visible:outline-primary rounded hover:underline focus-visible:outline-2"
                                            tabIndex={5}
                                        >
                                            Mot de passe oublié ?
                                        </Link>
                                    )}
                                    <Link
                                        href={loginEntry()}
                                        className="text-muted-foreground hover:text-primary focus-visible:outline-primary ml-auto rounded text-right hover:underline focus-visible:outline-2"
                                        tabIndex={6}
                                    >
                                        Changer d’établissement
                                    </Link>
                                </div>
                            </>
                        )}
                    </Form>

                    {status && (
                        <div className="text-primary mt-6 text-center text-sm font-medium">
                            {status}
                        </div>
                    )}
                </section>
            </AuthPageFrame>
        </>
    );
}

Login.layout = null;
