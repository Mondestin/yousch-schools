import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import InputError from '@/components/input-error';
import { FormSteps } from '@/components/sms/form-steps';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { store } from '@/routes/register';
import { login as loginRoute } from '@/routes';

type Props = {
    passwordRules?: string;
};

const STEPS = [
    { id: 'school', title: 'Établissement' },
    { id: 'admin', title: 'Administrateur' },
    { id: 'access', title: 'Accès' },
] as const;

type FormState = {
    schoolName: string;
    domain: string;
    city: string;
    phone: string;
    adminName: string;
    adminEmail: string;
    password: string;
    password_confirmation: string;
};

const schoolStepSchema = z.object({
    schoolName: z
        .string()
        .trim()
        .min(1, 'Le nom de l’établissement est obligatoire.'),
    domain: z
        .string()
        .trim()
        .min(1, 'Le domaine de connexion est obligatoire.')
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
            'Le domaine ne peut contenir que des lettres, chiffres et tirets.',
        ),
    city: z.string().trim().optional(),
    phone: z.string().trim().optional(),
});

const adminStepSchema = z.object({
    adminName: z
        .string()
        .trim()
        .min(1, 'Le nom de l’administrateur est obligatoire.'),
    adminEmail: z
        .string()
        .trim()
        .min(1, 'L’e-mail de l’administrateur est obligatoire.')
        .email('Indiquez une adresse e-mail valide.'),
});

const accessStepSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: 'La confirmation du mot de passe ne correspond pas.',
        path: ['password_confirmation'],
    });

const blankForm = (): FormState => ({
    schoolName: '',
    domain: '',
    city: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    password: '',
    password_confirmation: '',
});

export default function RegisterSchool({ passwordRules }: Props) {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormState>(blankForm);
    const [processing, setProcessing] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const stepId = STEPS[step].id;
    const lastStep = step === STEPS.length - 1;

    const stepDescription = useMemo(() => {
        if (stepId === 'school') {
            return 'Identité et domaine de connexion de l’école';
        }

        if (stepId === 'admin') {
            return 'Compte administrateur qui pilotera Yousch';
        }

        return 'Mot de passe pour sécuriser l’accès';
    }, [stepId]);

    function patch(next: Partial<FormState>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    function validateCurrentStep(): boolean {
        if (stepId === 'school') {
            return validate(schoolStepSchema, form);
        }

        if (stepId === 'admin') {
            return validate(adminStepSchema, form);
        }

        return validate(accessStepSchema, form);
    }

    function goNext(): void {
        if (!validateCurrentStep()) {
            return;
        }

        setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }

    function goBack(): void {
        clearErrors();
        setStep((current) => Math.max(current - 1, 0));
    }

    function submit(): void {
        if (!validateCurrentStep()) {
            return;
        }

        setProcessing(true);

        router.post(
            store.url(),
            {
                schoolName: form.schoolName.trim(),
                domain: form.domain.trim().toLowerCase(),
                city: form.city.trim() || null,
                phone: form.phone.trim() || null,
                adminName: form.adminName.trim(),
                adminEmail: form.adminEmail.trim(),
                password: form.password,
                password_confirmation: form.password_confirmation,
            },
            {
                onError: (serverErrors) => {
                    showErrors(serverErrors);

                    if (
                        serverErrors.schoolName ||
                        serverErrors.domain ||
                        serverErrors.city ||
                        serverErrors.phone
                    ) {
                        setStep(0);
                    } else if (
                        serverErrors.adminName ||
                        serverErrors.adminEmail
                    ) {
                        setStep(1);
                    } else {
                        setStep(2);
                    }
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title="Enregistrer un établissement" />

            <div className="flex flex-col gap-6">
                <FormSteps
                    steps={[...STEPS]}
                    current={step}
                    onSelect={(index) => {
                        if (index <= step) {
                            clearErrors();
                            setStep(index);
                        }
                    }}
                />

                <p className="text-muted-foreground text-center text-[13px]">
                    Étape {step + 1} sur {STEPS.length} : {stepDescription}
                </p>

                <form
                    className="grid gap-6"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (lastStep) {
                            submit();

                            return;
                        }

                        goNext();
                    }}
                >
                    {stepId === 'school' ? (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="schoolName">
                                    Nom de l’établissement
                                </Label>
                                <Input
                                    id="schoolName"
                                    value={form.schoolName}
                                    onChange={(event) =>
                                        patch({
                                            schoolName: event.target.value,
                                        })
                                    }
                                    required
                                    autoFocus
                                    autoComplete="organization"
                                    placeholder="Complexe Scolaire Les Palmiers"
                                    aria-invalid={Boolean(errors.schoolName)}
                                />
                                <InputError message={errors.schoolName} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="domain">
                                    Domaine de connexion
                                </Label>
                                <Input
                                    id="domain"
                                    value={form.domain}
                                    onChange={(event) =>
                                        patch({ domain: event.target.value })
                                    }
                                    required
                                    autoComplete="off"
                                    placeholder="palmiers"
                                    aria-invalid={Boolean(errors.domain)}
                                />
                                <p className="text-muted-foreground text-[12px] leading-relaxed">
                                    Lettres, chiffres et tirets. Vos équipes se
                                    connecteront via ce domaine.
                                </p>
                                <InputError message={errors.domain} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="city">Ville</Label>
                                    <Input
                                        id="city"
                                        value={form.city}
                                        onChange={(event) =>
                                            patch({ city: event.target.value })
                                        }
                                        autoComplete="address-level2"
                                        placeholder="Brazzaville"
                                        aria-invalid={Boolean(errors.city)}
                                    />
                                    <InputError message={errors.city} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Téléphone</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={(event) =>
                                            patch({ phone: event.target.value })
                                        }
                                        autoComplete="tel"
                                        placeholder="06 000 00 00"
                                        aria-invalid={Boolean(errors.phone)}
                                    />
                                    <InputError message={errors.phone} />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {stepId === 'admin' ? (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="adminName">Nom complet</Label>
                                <Input
                                    id="adminName"
                                    value={form.adminName}
                                    onChange={(event) =>
                                        patch({
                                            adminName: event.target.value,
                                        })
                                    }
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    placeholder="Marie Okemba"
                                    aria-invalid={Boolean(errors.adminName)}
                                />
                                <InputError message={errors.adminName} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="adminEmail">E-mail</Label>
                                <Input
                                    id="adminEmail"
                                    type="email"
                                    value={form.adminEmail}
                                    onChange={(event) =>
                                        patch({
                                            adminEmail: event.target.value,
                                        })
                                    }
                                    required
                                    autoComplete="username"
                                    placeholder="direction@palmiers.cg"
                                    aria-invalid={Boolean(errors.adminEmail)}
                                />
                                <InputError message={errors.adminEmail} />
                            </div>
                        </div>
                    ) : null}

                    {stepId === 'access' ? (
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={form.password}
                                    onChange={(event) =>
                                        patch({
                                            password: event.target.value,
                                        })
                                    }
                                    required
                                    autoFocus
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    aria-invalid={Boolean(errors.password)}
                                />
                                {passwordRules ? (
                                    <p className="text-muted-foreground text-[12px]">
                                        {passwordRules}
                                    </p>
                                ) : null}
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirmer le mot de passe
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={(event) =>
                                        patch({
                                            password_confirmation:
                                                event.target.value,
                                        })
                                    }
                                    required
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    aria-invalid={Boolean(
                                        errors.password_confirmation,
                                    )}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        {step > 0 ? (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={goBack}
                            >
                                Retour
                            </Button>
                        ) : (
                            <span className="hidden sm:block" />
                        )}

                        <Button
                            type="submit"
                            className="w-full sm:w-auto sm:min-w-40"
                            disabled={processing}
                            data-test="register-school-button"
                        >
                            {processing && <Spinner />}
                            {lastStep
                                ? 'Enregistrer un établissement'
                                : 'Continuer'}
                        </Button>
                    </div>
                </form>

                <div className="text-muted-foreground text-center text-sm">
                    Déjà un compte ?{' '}
                    <TextLink href={loginRoute()}>Se connecter</TextLink>
                </div>
            </div>
        </>
    );
}

RegisterSchool.layout = {
    title: 'Enregistrer un établissement',
    description: 'Trois étapes pour ouvrir l’espace Yousch de votre école',
};
