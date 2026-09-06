import { Form, Head, Link } from '@inertiajs/react';
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

export default function Login({ status, canResetPassword, school }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { errors, clearErrors, validate } = useFieldErrors();
    const initials = schoolInitials(school.name);

    return (
        <>
            <Head title={`Connexion · ${school.name}`} />

            <div className="bg-background text-foreground flex min-h-svh flex-col">
                <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
                    <div className="flex flex-col items-center text-center">
                        {school.logoUrl ? (
                            <img
                                src={school.logoUrl}
                                alt={school.name}
                                className="h-16 w-auto max-w-[12rem] object-contain md:h-20"
                            />
                        ) : (
                            <div
                                aria-hidden
                                className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-2xl text-[18px] font-semibold tracking-tight md:size-20 md:text-[22px]"
                            >
                                {initials}
                            </div>
                        )}

                        <h1 className="mt-6 text-xl leading-tight font-semibold tracking-tight md:text-2xl">
                            {school.name}
                        </h1>
                    </div>

                    <Form
                        action={store()}
                        resetOnSuccess={['password']}
                        noValidate
                        className="mt-10 flex flex-col gap-6"
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
                                        className="w-full"
                                        size="lg"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                    >
                                        {processing && <Spinner />}
                                        Accéder au portail
                                    </Button>
                                </div>

                                <div className="flex flex-col items-center gap-2.5 text-center text-[13px]">
                                    {canResetPassword && (
                                        <Link
                                            href={request()}
                                            className="text-muted-foreground hover:text-foreground"
                                            tabIndex={5}
                                        >
                                            Mot de passe oublié ?
                                        </Link>
                                    )}
                                    <Link
                                        href={loginEntry()}
                                        className="text-muted-foreground hover:text-foreground"
                                        tabIndex={6}
                                    >
                                        Ce n’est pas mon établissement
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
                </main>

                <footer className="text-muted-foreground px-6 py-5 text-center text-[11px] tracking-wide">
                    Powered by{' '}
                    <span className="text-foreground/80 font-medium">
                        Phoenone
                    </span>
                </footer>
            </div>
        </>
    );
}

Login.layout = null;
