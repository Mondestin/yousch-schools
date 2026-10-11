import { Form, Head, router, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { domain } from '@/routes/login';
import { resend, store } from '@/routes/login/code';

const CODE_LENGTH = 4;

type Props = {
    email: string;
    expiresIn: number;
    status?: string;
    school: {
        id: string;
        name: string;
        domain: string;
        logoUrl: string | null;
    };
};

export default function LoginCode({ email, status, school }: Props) {
    const [code, setCode] = useState('');
    const [resending, setResending] = useState(false);

    setLayoutProps({
        title: 'Vérifiez votre e-mail',
        description: `Saisissez le code à 4 chiffres envoyé à ${email}.`,
    });

    const handleResend = (): void => {
        setResending(true);
        router.post(
            resend.url(),
            {},
            {
                preserveScroll: true,
                onFinish: () => setResending(false),
            },
        );
    };

    return (
        <>
            <Head title={`Code de connexion · ${school.name}`} />

            {status && (
                <div
                    role="status"
                    className="bg-primary/5 text-primary mb-6 rounded-lg p-3 text-[13px] leading-relaxed"
                >
                    {status}
                </div>
            )}

            <Form
                action={store()}
                className="space-y-6"
                resetOnError
                onSuccess={() => setCode('')}
            >
                {({ processing, errors }) => (
                    <div className="mx-auto w-full max-w-[18rem] space-y-4">
                        <div className="flex flex-col items-center justify-center space-y-3 text-center">
                            <InputOTP
                                name="code"
                                maxLength={CODE_LENGTH}
                                value={code}
                                onChange={setCode}
                                disabled={processing}
                                pattern={REGEXP_ONLY_DIGITS}
                                autoFocus
                                containerClassName="gap-2"
                            >
                                <InputOTPGroup className="gap-2">
                                    {Array.from(
                                        { length: CODE_LENGTH },
                                        (_, index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                                className="h-12 w-11 rounded-md border text-lg first:rounded-md last:rounded-md"
                                            />
                                        ),
                                    )}
                                </InputOTPGroup>
                            </InputOTP>
                            <InputError message={errors.code} />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={
                                processing || code.length !== CODE_LENGTH
                            }
                            data-test="login-code-button"
                        >
                            {processing ? <Spinner /> : 'Confirmer'}
                        </Button>

                        <div className="text-muted-foreground text-center text-sm">
                            <button
                                type="button"
                                className="text-primary decoration-primary/30 hover:decoration-primary cursor-pointer underline underline-offset-4 transition-colors"
                                disabled={resending}
                                onClick={handleResend}
                            >
                                {resending ? 'Envoi…' : 'Renvoyer le code'}
                            </button>
                        </div>
                    </div>
                )}
            </Form>

            <div className="text-muted-foreground mt-6 text-center text-sm">
                <TextLink href={domain(school.domain)}>Retour à la connexion</TextLink>
            </div>
        </>
    );
}
