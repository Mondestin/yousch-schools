import { Form, Head, Link } from '@inertiajs/react';
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
            <Head title="Domaine de l’établissement" />

            <Form
                action={resolveDomain()}
                noValidate
                className="flex flex-col gap-6"
                onBefore={() => validate(domainSchema, { domain })}
            >
                {({ processing, errors: serverErrors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="domain">
                                    Domaine de l’établissement
                                </Label>
                                <Input
                                    id="domain"
                                    name="domain"
                                    value={domain}
                                    onChange={(event) => {
                                        clearErrors('domain');
                                        setDomain(event.target.value);
                                    }}
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="organization"
                                    placeholder="palmiers"
                                    aria-invalid={Boolean(
                                        errors.domain ?? serverErrors.domain,
                                    )}
                                />
                                <p className="text-muted-foreground text-[12px] leading-relaxed">
                                    Saisissez le domaine fourni par votre
                                    direction d’établissement pour ouvrir son
                                    portail personnel.
                                </p>
                                <InputError
                                    message={
                                        errors.domain ?? serverErrors.domain
                                    }
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                tabIndex={2}
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Continuer
                            </Button>

                            <Link
                                href={home()}
                                className="text-muted-foreground hover:text-foreground block text-center text-sm"
                                tabIndex={3}
                            >
                                Retour à l’accueil
                            </Link>

                            <p className="text-muted-foreground text-center text-sm">
                                Nouvel établissement ?{' '}
                                <Link
                                    href={register()}
                                    className="text-primary hover:underline"
                                    tabIndex={4}
                                >
                                    Enregistrer un établissement
                                </Link>
                            </p>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="text-primary mb-4 text-center text-sm font-medium">
                    {status}
                </div>
            )}
        </>
    );
}

LoginDomain.layout = {
    title: 'Connexion',
    description: 'Indiquez le domaine de votre établissement',
};
