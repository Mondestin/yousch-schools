import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Mot de passe oublié" />

            {status && (
                <div role="status" className="bg-primary/5 text-primary rounded-lg p-3 text-[13px] leading-relaxed">
                    {status}
                </div>
            )}

            <div className="space-y-6">
                <Form action={email()}>
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    placeholder="prenom.nom@ecole.cg"
                                    aria-invalid={Boolean(errors.email)}
                                />

                                <InputError message={errors.email} />
                            </div>

                            <div className="mt-5 flex items-center justify-start">
                                <Button
                                    type="submit"
                                    className="h-11 w-full gap-2 rounded-lg text-[13px]"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}
                                    {processing ? 'Envoi…' : 'Envoyer le lien'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="text-muted-foreground space-x-1 text-center text-sm">
                    <span>Retour à la</span>
                    <TextLink href={login()}>connexion</TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Mot de passe oublié',
    description:
        'Saisissez l’adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.',
};
