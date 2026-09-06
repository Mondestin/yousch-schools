import { Form, Head, router, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { UserRound } from 'lucide-react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { PhotoField } from '@/components/sms/photo-field';
import { StaffRoleBadge } from '@/components/sms/code-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSchoolContext } from '@/hooks/use-school-context';
import { roleLabel, roleSummary, STAFF_ROLES } from '@/lib/school-access';
import { teacherFiche } from '@/lib/school-staff';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';

type PageProps = {
    auth: Auth;
    catalog: import('@/types/school').SchoolDataset | null;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth, catalog } = usePage<PageProps>().props;
    const { staffRole, query, filter } = useSchoolContext();
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        auth.user.avatar ?? null,
    );
    const teacherId =
        catalog?.teachers.find((item) => item.email === auth.user.email)?.id ??
        'tc-4';
    const fiche =
        staffRole === 'enseignant' && catalog
            ? teacherFiche(catalog, teacherId, filter.academicYearId)
            : null;

    return (
        <>
            <Head title="Paramètres du profil" />

            <h1 className="sr-only">Paramètres du profil</h1>

            <div className="space-y-6">
                <section className="space-y-3 rounded-[8px] border px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold">Rôle</h2>
                        <StaffRoleBadge role={staffRole} />
                    </div>
                    <p className="text-muted-foreground text-[13px]">
                        {roleSummary(staffRole)}
                    </p>
                    {fiche && fiche.assignments.length > 0 ? (
                        <ul className="text-[13px]">
                            {fiche.assignments.map((item) => (
                                <li key={item.id}>
                                    {item.classroom} · {item.subject}
                                    {item.trackCode
                                        ? ` · ${item.trackCode}`
                                        : ''}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                        {STAFF_ROLES.map((role) => (
                            <Button
                                key={role}
                                type="button"
                                size="sm"
                                variant={
                                    role === staffRole ? 'default' : 'outline'
                                }
                                onClick={() =>
                                    router.get(
                                        edit.url(),
                                        { ...query, role },
                                        { preserveState: true },
                                    )
                                }
                            >
                                {roleLabel(role)}
                            </Button>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-[12px]">
                        Aperçu maquette : le menu et ce profil suivent le rôle.
                    </p>
                </section>

                <Heading
                    variant="small"
                    title="Profil"
                    description="Mettez à jour votre nom et votre e-mail"
                />

                <Form
                    action={ProfileController.update()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <PhotoField
                                id="avatar"
                                label="Photo de profil"
                                preview={photoPreview}
                                fallback={UserRound}
                                alt={auth.user.name}
                                onFile={(file) =>
                                    setPhotoPreview(
                                        file ? URL.createObjectURL(file) : null,
                                    )
                                }
                            />

                            <div className="grid gap-2">
                                <Label htmlFor="name">Nom</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Nom complet"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Adresse e-mail"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="text-muted-foreground -mt-4 text-sm">
                                            Votre e-mail n’est pas encore
                                            vérifié.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-primary decoration-primary/30 hover:decoration-primary underline underline-offset-4 transition-colors duration-300 ease-out"
                                            >
                                                Renvoyer l’e-mail de
                                                vérification.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="text-primary mt-2 text-sm font-medium">
                                                Un nouveau lien de vérification
                                                a été envoyé.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Enregistrer
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profil',
            href: edit(),
        },
    ],
};
