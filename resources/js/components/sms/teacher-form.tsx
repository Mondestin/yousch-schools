import { Briefcase, MapPin, Phone, User } from 'lucide-react';
import { DatePicker } from '@/components/sms/date-picker';
import { Field } from '@/components/sms/field';
import { FormSection } from '@/components/sms/form-layout';
import { GenderSelect } from '@/components/sms/gender-select';
import { PhotoField } from '@/components/sms/photo-field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MARITAL_STATUSES } from '@/lib/school-staff';
import {
    genderSchema,
    optionalEmail,
    parseFields,
    requiredDate,
    requiredText,
    type FieldErrors,
} from '@/lib/school-form';
import { DEFAULT_CITY } from '@/lib/school-rows';
import type { Gender, Teacher } from '@/types/school';
import { z } from 'zod';

export type TeacherFormValues = {
    code: string;
    lastName: string;
    firstName: string;
    gender: Gender;
    phone: string;
    email: string;
    qualification: string;
    position: string;
    hiredOn: string;
    bornOn: string;
    city: string;
    neighborhood: string;
    address: string;
    maritalStatus: string;
    status: Teacher['status'];
};

export type TeacherFormSection =
    | 'all'
    | 'identity'
    | 'post'
    | 'contact'
    | 'address';

export const teacherFormSchema = z.object({
    code: requiredText('Le matricule'),
    lastName: requiredText('Le nom'),
    firstName: requiredText('Le prénom'),
    gender: genderSchema,
    phone: requiredText('Le téléphone'),
    email: optionalEmail(),
    qualification: requiredText('La qualification'),
    position: z.string(),
    hiredOn: requiredDate('La date d’embauche'),
    bornOn: z.string(),
    city: requiredText('La ville'),
    neighborhood: requiredText('Le quartier'),
    address: z.string(),
    maritalStatus: requiredText('La situation'),
    status: z.enum(['actif', 'inactif']),
});

export function teacherStepSchema(section: TeacherFormSection | 'files') {
    if (section === 'identity') {
        return teacherFormSchema.pick({
            code: true,
            lastName: true,
            firstName: true,
            gender: true,
            maritalStatus: true,
        });
    }

    if (section === 'post') {
        return teacherFormSchema.pick({
            qualification: true,
            hiredOn: true,
            status: true,
        });
    }

    if (section === 'contact') {
        return teacherFormSchema.pick({
            phone: true,
            email: true,
        });
    }

    if (section === 'address') {
        return teacherFormSchema.pick({
            city: true,
            neighborhood: true,
        });
    }

    if (section === 'files') {
        return z.object({});
    }

    return teacherFormSchema;
}

export function TeacherFormFields({
    form,
    onChange,
    photoPreview,
    onPhoto,
    layout = 'sheet',
    section = 'all',
    errors = {},
}: {
    form: TeacherFormValues;
    onChange: (patch: Partial<TeacherFormValues>) => void;
    photoPreview: string | null;
    onPhoto: (file: File | null) => void;
    layout?: 'sheet' | 'page';
    section?: TeacherFormSection;
    errors?: FieldErrors;
}) {
    const fields = {
        photo: (
            <PhotoField
                preview={photoPreview}
                fallback={Briefcase}
                size={layout === 'page' ? 'lg' : 'sm'}
                onFile={onPhoto}
            />
        ),
        code: (
            <Field id="code" label="Matricule" required error={errors.code}>
                <Input
                    id="code"
                    value={form.code}
                    required
                    onChange={(event) => onChange({ code: event.target.value })}
                />
            </Field>
        ),
        lastName: (
            <Field id="lastName" label="Nom" required error={errors.lastName}>
                <Input
                    id="lastName"
                    value={form.lastName}
                    required
                    onChange={(event) =>
                        onChange({ lastName: event.target.value })
                    }
                />
            </Field>
        ),
        firstName: (
            <Field
                id="firstName"
                label="Prénom"
                required
                error={errors.firstName}
            >
                <Input
                    id="firstName"
                    value={form.firstName}
                    required
                    onChange={(event) =>
                        onChange({ firstName: event.target.value })
                    }
                />
            </Field>
        ),
        gender: (
            <GenderSelect
                value={form.gender}
                required
                error={errors.gender}
                onChange={(value) => onChange({ gender: value })}
            />
        ),
        phone: (
            <Field id="phone" label="Téléphone" required error={errors.phone}>
                <Input
                    id="phone"
                    value={form.phone}
                    required
                    onChange={(event) =>
                        onChange({ phone: event.target.value })
                    }
                />
            </Field>
        ),
        email: (
            <Field id="email" label="E-mail" error={errors.email}>
                <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                        onChange({ email: event.target.value })
                    }
                />
            </Field>
        ),
        bornOn: (
            <Field id="bornOn" label="Date de naissance" error={errors.bornOn}>
                <DatePicker
                    id="bornOn"
                    value={form.bornOn}
                    onChange={(value) => onChange({ bornOn: value })}
                />
            </Field>
        ),
        position: (
            <Field id="position" label="Poste" error={errors.position}>
                <Input
                    id="position"
                    value={form.position}
                    onChange={(event) =>
                        onChange({ position: event.target.value })
                    }
                />
            </Field>
        ),
        qualification: (
            <Field
                id="qualification"
                label="Qualification"
                required
                error={errors.qualification}
            >
                <Input
                    id="qualification"
                    value={form.qualification}
                    required
                    onChange={(event) =>
                        onChange({ qualification: event.target.value })
                    }
                />
            </Field>
        ),
        hiredOn: (
            <Field
                id="hiredOn"
                label="Date d’embauche"
                required
                error={errors.hiredOn}
            >
                <DatePicker
                    id="hiredOn"
                    value={form.hiredOn}
                    required
                    onChange={(value) => onChange({ hiredOn: value })}
                />
            </Field>
        ),
        city: (
            <Field id="city" label="Ville" required error={errors.city}>
                <Input
                    id="city"
                    value={form.city}
                    required
                    onChange={(event) => onChange({ city: event.target.value })}
                />
            </Field>
        ),
        neighborhood: (
            <Field
                id="neighborhood"
                label="Quartier"
                required
                error={errors.neighborhood}
            >
                <Input
                    id="neighborhood"
                    value={form.neighborhood}
                    required
                    onChange={(event) =>
                        onChange({ neighborhood: event.target.value })
                    }
                />
            </Field>
        ),
        address: (
            <Field id="address" label="Adresse" error={errors.address}>
                <Input
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                        onChange({ address: event.target.value })
                    }
                />
            </Field>
        ),
        maritalStatus: (
            <Field
                id="maritalStatus"
                label="Situation"
                required
                error={errors.maritalStatus}
            >
                <Select
                    value={form.maritalStatus}
                    onValueChange={(value) =>
                        onChange({ maritalStatus: value })
                    }
                >
                    <SelectTrigger id="maritalStatus" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MARITAL_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
        ),
        status: (
            <Field id="status" label="Statut" required error={errors.status}>
                <Select
                    value={form.status}
                    onValueChange={(value) =>
                        onChange({ status: value as Teacher['status'] })
                    }
                >
                    <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                </Select>
            </Field>
        ),
    };

    const identity = (
        <>
            {fields.photo}
            {fields.code}
            {fields.lastName}
            {fields.firstName}
            {fields.gender}
            {fields.bornOn}
            {fields.maritalStatus}
        </>
    );
    const post = (
        <>
            {fields.position}
            {fields.qualification}
            {fields.hiredOn}
            {fields.status}
        </>
    );
    const contact = (
        <>
            {fields.phone}
            {fields.email}
        </>
    );
    const address = (
        <>
            {fields.city}
            {fields.neighborhood}
            {fields.address}
        </>
    );

    if (layout === 'page') {
        const pageIdentity = (
            <FormSection
                icon={User}
                title="Identité"
                description="Photo, matricule et état civil."
            >
                <div className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start">
                    {fields.photo}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {fields.code}
                        {fields.lastName}
                        {fields.firstName}
                        {fields.gender}
                        {fields.bornOn}
                        {fields.maritalStatus}
                    </div>
                </div>
            </FormSection>
        );
        const pagePost = (
            <FormSection
                icon={Briefcase}
                title="Poste"
                description="Fonction, qualification et date d’embauche."
            >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {fields.position}
                    {fields.qualification}
                    {fields.hiredOn}
                    {fields.status}
                </div>
            </FormSection>
        );
        const pageContact = (
            <FormSection
                icon={Phone}
                title="Contact"
                description="Téléphone et courriel professionnels."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    {fields.phone}
                    {fields.email}
                </div>
            </FormSection>
        );
        const pageAddress = (
            <FormSection
                icon={MapPin}
                title="Adresse"
                description="Ville, quartier et domicile."
            >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {fields.city}
                    {fields.neighborhood}
                    {fields.address}
                </div>
            </FormSection>
        );

        if (section === 'identity') {
            return pageIdentity;
        }

        if (section === 'post') {
            return pagePost;
        }

        if (section === 'contact') {
            return pageContact;
        }

        if (section === 'address') {
            return pageAddress;
        }

        return (
            <>
                {pageIdentity}
                {pagePost}
                {pageContact}
                {pageAddress}
            </>
        );
    }

    if (section === 'identity') {
        return identity;
    }

    if (section === 'post') {
        return post;
    }

    if (section === 'contact') {
        return contact;
    }

    if (section === 'address') {
        return address;
    }

    return (
        <>
            {fields.photo}
            {fields.code}
            {fields.lastName}
            {fields.firstName}
            {fields.gender}
            {fields.phone}
            {fields.email}
            {fields.bornOn}
            {fields.position}
            {fields.qualification}
            {fields.hiredOn}
            {fields.city}
            {fields.neighborhood}
            {fields.address}
            {fields.maritalStatus}
            {fields.status}
        </>
    );
}

export function teacherFromForm(
    form: TeacherFormValues,
): Omit<Teacher, 'id' | 'photoUrl'> {
    return {
        code: form.code.trim(),
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        qualification: form.qualification.trim(),
        position: form.position.trim() || null,
        hiredOn: form.hiredOn,
        bornOn: form.bornOn || null,
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim() || null,
        maritalStatus: form.maritalStatus,
        status: form.status,
    };
}

export function teacherFormValid(form: TeacherFormValues): boolean {
    return parseFields(teacherFormSchema, form).ok;
}

export const TEACHER_FORM_STEPS = [
    { id: 'identity', title: 'Identité' },
    { id: 'post', title: 'Poste' },
    { id: 'contact', title: 'Contact' },
    { id: 'address', title: 'Adresse' },
    { id: 'files', title: 'Dossier' },
] as const;

export type TeacherFormStepId = (typeof TEACHER_FORM_STEPS)[number]['id'];

export function teacherSectionValid(
    form: TeacherFormValues,
    section: TeacherFormSection | TeacherFormStepId,
): boolean {
    return parseFields(teacherStepSchema(section), form).ok;
}

export function blankTeacherForm(
    code: string,
    city = DEFAULT_CITY,
): TeacherFormValues {
    return {
        code,
        lastName: '',
        firstName: '',
        gender: 'femme',
        phone: '',
        email: '',
        qualification: '',
        position: '',
        hiredOn: '',
        bornOn: '',
        city,
        neighborhood: '',
        address: '',
        maritalStatus: 'célibataire',
        status: 'actif',
    };
}

export function teacherToForm(teacher: Teacher): TeacherFormValues {
    return {
        code: teacher.code,
        lastName: teacher.lastName,
        firstName: teacher.firstName,
        gender: teacher.gender,
        phone: teacher.phone,
        email: teacher.email ?? '',
        qualification: teacher.qualification,
        position: teacher.position ?? '',
        hiredOn: teacher.hiredOn,
        bornOn: teacher.bornOn ?? '',
        city: teacher.city,
        neighborhood: teacher.neighborhood,
        address: teacher.address ?? '',
        maritalStatus: teacher.maritalStatus,
        status: teacher.status,
    };
}
