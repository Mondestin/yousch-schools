import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Vérification e-mail" />

            {status === 'verification-link-sent' && (
                <div className="text-primary mb-4 text-center text-sm font-medium">
                    Un nouveau lien de vérification a été envoyé à votre adresse
                    e-mail.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Renvoyer l’e-mail
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Déconnexion
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Vérifiez votre e-mail',
    description:
        'Cliquez sur le lien que nous venons d’envoyer pour confirmer votre adresse.',
};
