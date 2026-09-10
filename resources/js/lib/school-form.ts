import { z } from 'zod';

export type FieldErrors = Record<string, string>;

export function requiredText(label: string): z.ZodString {
    return z.string().trim().min(1, `${label} est obligatoire.`);
}

export function requiredDate(label: string): z.ZodString {
    return z.string().trim().min(1, `${label} est obligatoire.`);
}

export function optionalEmail(): z.ZodType<string> {
    return z
        .string()
        .trim()
        .refine(
            (value) =>
                value === '' || z.string().email().safeParse(value).success,
            'Indiquez un e-mail valide.',
        );
}

export function requiredEmail(label = 'L’e-mail'): z.ZodString {
    return z
        .string()
        .trim()
        .min(1, `${label} est obligatoire.`)
        .email('Indiquez un e-mail valide.');
}

export function requiredAmount(label = 'Le montant'): z.ZodType<string> {
    return z.string().refine((value) => {
        const amount = Number(value.replace(',', '.'));

        return Number.isFinite(amount) && amount > 0;
    }, `${label} doit être un nombre positif.`);
}

export function requiredInt(label: string, min = 0): z.ZodType<string> {
    return z.string().refine((value) => {
        const parsed = Number(value);

        return (
            Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= min
        );
    }, `${label} doit être un entier valide.`);
}

export const genderSchema = z.enum(['femme', 'homme'], {
    required_error: 'Le genre est obligatoire.',
    invalid_type_error: 'Le genre est obligatoire.',
});

export function zodFieldErrors(error: z.ZodError): FieldErrors {
    const errors: FieldErrors = {};

    for (const issue of error.issues) {
        const key = issue.path.map(String).join('.');

        if (key !== '' && errors[key] === undefined) {
            errors[key] = issue.message;
        }
    }

    return errors;
}

export const studentIdentitySchema = z.object({
    lastName: requiredText('Le nom'),
    firstName: requiredText('Le prénom'),
    gender: genderSchema,
    bornOn: requiredDate('La date de naissance'),
});

export const studentContactSchema = z.object({
    city: requiredText('La ville'),
    neighborhood: requiredText('Le quartier'),
    address: z.string(),
    phone: z.string(),
    email: optionalEmail(),
    enrolledOn: requiredDate('La date d’inscription'),
});

export function studentSchoolSchema(lycee: boolean) {
    return z.object({
        classroomId: requiredText('La classe'),
        enrolledOn: requiredDate('La date d’inscription'),
        trackId: lycee ? requiredText('La série') : z.string(),
    });
}

export const studentPreviousAcademicFields = z.object({
    isTransfer: z.boolean(),
    previousSchoolName: z.string(),
    previousAcademicYear: z.string(),
    previousClass: z.string(),
    previousSchoolCity: z.string(),
});

function refinePreviousAcademic(
    data: z.infer<typeof studentPreviousAcademicFields>,
    ctx: z.RefinementCtx,
): void {
    if (!data.isTransfer) {
        return;
    }

    if (data.previousSchoolName.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'L’établissement précédent est obligatoire.',
            path: ['previousSchoolName'],
        });
    }

    if (data.previousAcademicYear.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'L’année scolaire précédente est obligatoire.',
            path: ['previousAcademicYear'],
        });
    }
}

export const studentPreviousAcademicSchema =
    studentPreviousAcademicFields.superRefine(refinePreviousAcademic);

export function studentSchoolStepSchema(lycee: boolean) {
    return studentSchoolSchema(lycee)
        .merge(studentPreviousAcademicFields)
        .superRefine(refinePreviousAcademic);
}

export const guardianPersonSchema = z.object({
    lastName: requiredText('Le nom'),
    firstName: requiredText('Le prénom'),
    phone: requiredText('Le téléphone'),
    profession: requiredText('La profession'),
    email: optionalEmail(),
});

export const studentGuardianSchema = z.object({
    guardianLastName: requiredText('Le nom'),
    guardianFirstName: requiredText('Le prénom'),
    guardianPhone: requiredText('Le téléphone'),
    guardianProfession: requiredText('La profession'),
    relation: requiredText('Le lien'),
    guardianEmail: optionalEmail(),
});

export function studentCreateSchema(lycee: boolean) {
    return studentIdentitySchema
        .merge(studentSchoolSchema(lycee))
        .merge(studentPreviousAcademicFields)
        .merge(
            studentContactSchema.omit({ enrolledOn: true }).extend({
                address: z.string(),
                phone: z.string(),
            }),
        )
        .merge(studentGuardianSchema)
        .superRefine(refinePreviousAcademic);
}

export function parseFields<T>(
    schema: z.ZodType<T>,
    data: unknown,
): { ok: true; data: T } | { ok: false; errors: FieldErrors } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { ok: true, data: result.data };
    }

    return { ok: false, errors: zodFieldErrors(result.error) };
}
