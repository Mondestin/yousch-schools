import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFieldErrors } from '@/hooks/use-field-errors';
import AuthPageFrame from '@/layouts/auth/auth-page-frame';
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

const passwordChecks = [
    { label: 'Au moins 8 caractères', valid: (value: string) => value.length >= 8 },
    { label: 'Au moins une lettre majuscule', valid: (value: string) => /\p{Lu}/u.test(value) },
    { label: 'Au moins un chiffre', valid: (value: string) => /[0-9]/.test(value) },
    { label: 'Au moins un caractère spécial', valid: (value: string) => /[^\p{L}\p{N}\s]/u.test(value) },
];

const accessStepSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
            .refine((value) => passwordChecks.every((rule) => rule.valid(value)), 'Ajoutez une majuscule, un chiffre et un caractère spécial.'),
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

            <AuthPageFrame>
            <div className="flex flex-col gap-6">
                <ol aria-label="Étapes d’inscription" className="flex items-center gap-2 text-[12px]">
                    {STEPS.map((item, index) => (
                        <li key={item.id} className={`flex items-center gap-2 ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
                            <button
                                type="button"
                                disabled={index > step || processing}
                                aria-current={index === step ? 'step' : undefined}
                                onClick={() => {
                                    clearErrors();
                                    setStep(index);
                                }}
                                className={`flex items-center gap-1.5 rounded text-[11px] sm:text-[12px] focus-visible:outline-2 focus-visible:outline-primary ${index === step ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                            >
                                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] ${index === step ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                                    {index + 1}
                                </span>
                                {item.title}
                            </button>
                            {index < STEPS.length - 1 && <span aria-hidden="true" className="bg-border h-px flex-1" />}
                        </li>
                    ))}
                </ol>
                <section className="bg-background border-border/80 flex flex-col gap-6 rounded-2xl border p-6 shadow-[0_8px_32px_rgba(15,23,42,0.04)] sm:p-8 [&_input]:h-11 [&_input]:rounded-lg [&_input]:text-[14px] [&_button[type=submit]]:min-h-11" aria-labelledby="register-title">
                <h1 id="register-title" className="text-[24px] leading-tight font-semibold tracking-tight">Enregistrer un établissement</h1>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
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
                                    autoCapitalize="none"
                                    spellCheck={false}
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
                                <PasswordInput
                                    id="password"
                                    value={form.password}
                                    onChange={(event) =>
                                        patch({
                                            password: event.target.value,
                                        })
                                    }
                                    required
                                    autoFocus
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                    aria-describedby="password-checks"
                                    placeholder="••••••••"
                                    aria-invalid={Boolean(errors.password)}
                                />
                                <ul id="password-checks" className="mt-1 grid gap-2 text-[12px]">
                                    {passwordChecks.map((rule) => {
                                        const validated = rule.valid(form.password);
                                        return (
                                            <li key={rule.label} className={`flex items-center gap-2 ${validated ? 'text-primary' : 'text-muted-foreground'}`}>
                                                <span role="checkbox" aria-checked={validated} aria-readonly="true" aria-label={rule.label} className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${validated ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                                                    {validated && <Check aria-hidden="true" className="size-3" />}
                                                </span>
                                                <span>{rule.label}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirmer le mot de passe
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
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

                    <div className={`grid gap-3 ${step > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {step > 0 ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full gap-2 rounded-lg text-[13px]"
                                disabled={processing}
                                onClick={goBack}
                            >
                                <ArrowLeft aria-hidden="true" className="size-4" />
                                Retour
                            </Button>
                        ) : null}

                        <Button
                            type="submit"
                            className="h-11 w-full gap-2 rounded-lg text-[13px]"
                            disabled={processing}
                            data-test="register-school-button"
                        >
                            {processing ? <Spinner /> : lastStep ? <Check aria-hidden="true" className="size-4" /> : null}
                            {lastStep
                                ? 'Enregistrer'
                                : 'Continuer'}
                            {!lastStep && !processing && <ArrowRight aria-hidden="true" className="size-4" />}
                        </Button>
                    </div>
                </form>

                <div className="text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 text-center text-[13px]">
                    Déjà un compte ?{' '}
                    <TextLink href={loginRoute()}>Se connecter</TextLink>
                </div>
                </section>
            </div>
            </AuthPageFrame>
        </>
    );
}

RegisterSchool.layout = null;
