import { Head } from '@inertiajs/react';
import { Building2, Stamp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { BulletinLetterhead } from '@/components/sms/bulletin-letterhead';
import { Field } from '@/components/sms/field';
import { PhotoField } from '@/components/sms/photo-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { ApiError, apiData } from '@/lib/api';
import { requiredEmail, requiredText } from '@/lib/school-form';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { update as updateProfile } from '@/routes/api/v1/school/profile';
import { index as school } from '@/routes/etablissement';
import type { SchoolDataset, SchoolProfile } from '@/types/school';

type ProfileForm = Pick<
    SchoolProfile,
    | 'name'
    | 'motto'
    | 'phone'
    | 'email'
    | 'address'
    | 'promoterName'
    | 'directorName'
    | 'city'
    | 'country'
>;

const profileSchema = z.object({
    name: requiredText('Le nom'),
    motto: requiredText('La devise'),
    phone: requiredText('Le téléphone'),
    email: requiredEmail(),
    address: requiredText('L’adresse'),
    city: requiredText('La ville'),
    country: requiredText('Le pays'),
    promoterName: requiredText('Le nom du promoteur'),
    directorName: requiredText('Le chef d’établissement'),
});

function revokeBlob(url: string | null): void {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

export default function SchoolProfilePage({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const initial: ProfileForm = {
        name: catalog.profile.name,
        motto: catalog.profile.motto,
        phone: catalog.profile.phone,
        email: catalog.profile.email,
        address: catalog.profile.address,
        promoterName: catalog.profile.promoterName,
        directorName: catalog.profile.directorName,
        city: catalog.profile.city,
        country: catalog.profile.country,
    };
    const [form, setForm] = useState<ProfileForm>(initial);
    const [logoPreview, setLogoPreview] = useState<string | null>(
        catalog.profile.logoUrl,
    );
    const [stampPreview, setStampPreview] = useState<string | null>(
        catalog.profile.stampUrl,
    );
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [removeStamp, setRemoveStamp] = useState(false);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();

    useEffect(() => {
        return () => {
            revokeBlob(logoPreview);
            revokeBlob(stampPreview);
        };
    }, [logoPreview, stampPreview]);

    function patchForm(patch: Partial<ProfileForm>): void {
        clearErrors(Object.keys(patch));
        setForm((current) => ({ ...current, ...patch }));
    }

    function reset(): void {
        setForm(initial);
        revokeBlob(logoPreview);
        revokeBlob(stampPreview);
        setLogoPreview(catalog.profile.logoUrl);
        setStampPreview(catalog.profile.stampUrl);
        setLogoFile(null);
        setStampFile(null);
        setRemoveLogo(false);
        setRemoveStamp(false);
        clearErrors();
    }

    async function save(): Promise<void> {
        if (!validate(profileSchema, form)) {
            return;
        }

        const body = new FormData();
        body.append('name', form.name.trim());
        body.append('motto', form.motto.trim());
        body.append('phone', form.phone.trim());
        body.append('email', form.email.trim());
        body.append('address', form.address.trim());
        body.append('city', form.city.trim());
        body.append('country', form.country.trim());
        body.append('promoterName', form.promoterName.trim());
        body.append('directorName', form.directorName.trim());
        body.append('currency', catalog.profile.currency || 'FCFA');

        if (logoFile) {
            body.append('logo', logoFile);
        } else if (removeLogo) {
            body.append('removeLogo', '1');
        }

        if (stampFile) {
            body.append('stamp', stampFile);
        } else if (removeStamp) {
            body.append('removeStamp', '1');
        }

        setSaving(true);

        try {
            const saved = await apiData<SchoolProfile>(updateProfile.url(), {
                method: 'POST',
                formData: body,
            });

            setLogoFile(null);
            setStampFile(null);
            setRemoveLogo(false);
            setRemoveStamp(false);
            revokeBlob(logoPreview);
            revokeBlob(stampPreview);
            setLogoPreview(saved.logoUrl);
            setStampPreview(saved.stampUrl);
            setForm({
                name: saved.name,
                motto: saved.motto,
                phone: saved.phone,
                email: saved.email,
                address: saved.address,
                promoterName: saved.promoterName,
                directorName: saved.directorName,
                city: saved.city,
                country: saved.country,
            });
            toastSaved('Identité de l’établissement enregistrée');
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Établissement" />
            <form
                noValidate
                className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
                        <PhotoField
                            id="logo"
                            label="Logo"
                            alt={`Logo ${form.name}`}
                            preview={logoPreview}
                            fallback={Building2}
                            onFile={(file) => {
                                revokeBlob(logoPreview);
                                setLogoFile(file);
                                setRemoveLogo(file === null);
                                setLogoPreview(
                                    file
                                        ? URL.createObjectURL(file)
                                        : catalog.profile.logoUrl,
                                );
                            }}
                        />
                        <div className="grid gap-4">
                            <Field
                                id="name"
                                label="Nom de l’établissement"
                                required
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    value={form.name}
                                    required
                                    onChange={(event) =>
                                        patchForm({ name: event.target.value })
                                    }
                                />
                            </Field>
                            <Field
                                id="motto"
                                label="Devise"
                                required
                                error={errors.motto}
                            >
                                <Input
                                    id="motto"
                                    value={form.motto}
                                    required
                                    placeholder="Rigueur — Travail — Réussite"
                                    onChange={(event) =>
                                        patchForm({ motto: event.target.value })
                                    }
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            id="phone"
                            label="Téléphone"
                            required
                            error={errors.phone}
                        >
                            <Input
                                id="phone"
                                value={form.phone}
                                required
                                placeholder="06 521 12 34 / 05 551 23 45"
                                onChange={(event) =>
                                    patchForm({ phone: event.target.value })
                                }
                            />
                        </Field>
                        <Field
                            id="email"
                            label="E-mail"
                            required
                            error={errors.email}
                        >
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                required
                                onChange={(event) =>
                                    patchForm({ email: event.target.value })
                                }
                            />
                        </Field>
                    </div>
                    <Field
                        id="address"
                        label="Adresse"
                        required
                        error={errors.address}
                    >
                        <Input
                            id="address"
                            value={form.address}
                            required
                            placeholder="Quartier Moungali, avenue de la Paix"
                            onChange={(event) =>
                                patchForm({ address: event.target.value })
                            }
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            id="city"
                            label="Ville"
                            required
                            error={errors.city}
                        >
                            <Input
                                id="city"
                                value={form.city}
                                required
                                onChange={(event) =>
                                    patchForm({ city: event.target.value })
                                }
                            />
                        </Field>
                        <Field
                            id="country"
                            label="Pays"
                            required
                            error={errors.country}
                        >
                            <Input
                                id="country"
                                value={form.country}
                                required
                                onChange={(event) =>
                                    patchForm({ country: event.target.value })
                                }
                            />
                        </Field>
                    </div>

                    <Field
                        id="promoterName"
                        label="Nom du promoteur"
                        required
                        error={errors.promoterName}
                        hint="Personne qui porte l’établissement."
                    >
                        <Input
                            id="promoterName"
                            value={form.promoterName}
                            required
                            onChange={(event) =>
                                patchForm({
                                    promoterName: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field
                        id="directorName"
                        label="Chef d’établissement"
                        required
                        error={errors.directorName}
                        hint="Directeur ou directrice en charge au quotidien."
                    >
                        <Input
                            id="directorName"
                            value={form.directorName}
                            required
                            onChange={(event) =>
                                patchForm({
                                    directorName: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <PhotoField
                        id="stamp"
                        label="Cachet et signature"
                        alt="Cachet et signature"
                        hint="Une seule image : le cachet de l’établissement et la signature du chef d’établissement. Elle est apposée sur les bulletins, relevés, reçus et attestations."
                        preview={stampPreview}
                        fallback={Stamp}
                        previewClassName="h-24 w-40 size-auto object-contain bg-muted/40"
                        onFile={(file) => {
                            revokeBlob(stampPreview);
                            setStampFile(file);
                            setRemoveStamp(file === null);
                            setStampPreview(
                                file
                                    ? URL.createObjectURL(file)
                                    : catalog.profile.stampUrl,
                            );
                        }}
                    />

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={reset}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </Button>
                    </div>
                </div>

                <aside className="lg:sticky lg:top-6">
                    <p className="mb-2 text-[13px] font-medium">
                        En-tête du bulletin
                    </p>
                    <div className="rounded-[8px] border bg-white p-5 text-black shadow-none">
                        <BulletinLetterhead
                            profile={form}
                            logoUrl={logoPreview}
                        />
                    </div>
                    <p className="text-muted-foreground mt-2 text-[13px]">
                        Aperçu de l’en-tête imprimé en haut à gauche des
                        bulletins.
                    </p>
                </aside>
            </form>
        </>
    );
}

SchoolProfilePage.layout = {
    breadcrumbs: [{ title: 'Établissement', href: school() }],
};
