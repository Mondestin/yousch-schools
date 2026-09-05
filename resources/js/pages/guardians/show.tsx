import { Head, Link, router } from '@inertiajs/react';
import { Eye, GraduationCap, Plus, UserMinus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { InfoField } from '@/components/sms/info-field';
import { PageShell } from '@/components/sms/page-shell';
import { RowMenu } from '@/components/sms/row-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonCell } from '@/components/sms/person-cell';
import { SearchSelect } from '@/components/sms/search-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { guardianPersonSchema, requiredText } from '@/lib/school-form';
import { personName, studentRows } from '@/lib/school-rows';
import { z } from 'zod';
import {
    GUARDIAN_RELATIONS,
    genderLabel,
    guardianFiche,
    guardianRelationLabel,
} from '@/lib/school-students';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    attachStudent,
    detachStudent,
    update as updateGuardian,
} from '@/routes/api/v1/guardians';
import { index as guardians } from '@/routes/guardians';
import {
    guardians as studentGuardians,
    show as showStudent,
} from '@/routes/students';
import type {
    Gender,
    Guardian,
    GuardianRelation,
    SchoolDataset,
    StudentGuardian,
} from '@/types/school';

const guardianLinkSchema = z.object({
    studentId: requiredText('L’élève'),
    relation: requiredText('Le lien'),
});

export default function GuardianShowPage({
    catalog,
    guardianId,
}: {
    catalog: SchoolDataset;
    guardianId: string;
}) {
    const { query, filter } = useSchoolContext();
    const [guardian, setGuardian] = useState<Guardian | null>(
        catalog.guardians.find((item) => item.id === guardianId) ?? null,
    );
    const [links, setLinks] = useState<StudentGuardian[]>(
        catalog.studentGuardians,
    );
    const [identityOpen, setIdentityOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [form, setForm] = useState({
        lastName: '',
        firstName: '',
        phone: '',
        profession: '',
        gender: '' as Gender | '',
        email: '',
        city: '',
        neighborhood: '',
        address: '',
    });
    const [linkForm, setLinkForm] = useState({
        studentId: '',
        relation: 'pere' as GuardianRelation,
    });
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [savingIdentity, setSavingIdentity] = useState(false);
    const [savingLink, setSavingLink] = useState(false);

    function patchForm(next: Partial<typeof form>): void {
        clearErrors(Object.keys(next));
        setForm((currentForm) => ({ ...currentForm, ...next }));
    }

    function patchLinkForm(next: Partial<typeof linkForm>): void {
        clearErrors(Object.keys(next));
        setLinkForm((currentForm) => ({ ...currentForm, ...next }));
    }

    const workingCatalog = useMemo(
        () =>
            guardian
                ? {
                      ...catalog,
                      guardians: catalog.guardians.map((item) =>
                          item.id === guardian.id ? guardian : item,
                      ),
                      studentGuardians: links,
                  }
                : catalog,
        [catalog, guardian, links],
    );
    const fiche = guardian ? guardianFiche(workingCatalog, guardian.id) : null;

    const candidates = useMemo(() => {
        const linked = new Set(
            links
                .filter((link) => link.guardianId === guardianId)
                .map((link) => link.studentId),
        );

        return studentRows(catalog).filter(
            (row) =>
                row.academicYearId === filter.academicYearId &&
                !linked.has(row.studentId),
        );
    }, [catalog, filter.academicYearId, guardianId, links]);

    if (!guardian || !fiche) {
        return null;
    }

    const current = guardian;

    function openEdit(): void {
        setForm({
            lastName: current.lastName,
            firstName: current.firstName,
            phone: current.phone,
            profession: current.profession,
            gender: current.gender ?? '',
            email: current.email ?? '',
            city: current.city ?? '',
            neighborhood: current.neighborhood ?? '',
            address: current.address ?? '',
        });
        clearErrors();
        setIdentityOpen(true);
    }

    async function saveIdentity(): Promise<void> {
        if (!validate(guardianPersonSchema, form)) {
            return;
        }

        const payload = {
            lastName: form.lastName.trim(),
            firstName: form.firstName.trim(),
            phone: form.phone.trim(),
            profession: form.profession.trim(),
            gender: form.gender === '' ? null : form.gender,
            email: form.email.trim() || null,
            city: form.city.trim() || null,
            neighborhood: form.neighborhood.trim() || null,
            address: form.address.trim() || null,
        };

        setSavingIdentity(true);

        try {
            const saved = await apiData<Guardian>(
                updateGuardian.url(guardianId),
                { method: 'PUT', body: payload },
            );
            setGuardian(saved);
            setIdentityOpen(false);
            toastSaved();
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);
        } finally {
            setSavingIdentity(false);
        }
    }

    function openLink(): void {
        setLinkForm({
            studentId: candidates[0]?.studentId ?? '',
            relation: 'pere',
        });
        clearErrors();
        setLinkOpen(true);
    }

    async function saveLink(): Promise<void> {
        if (!validate(guardianLinkSchema, linkForm)) {
            return;
        }

        setSavingLink(true);

        try {
            await apiJson(attachStudent.url(guardianId), {
                method: 'POST',
                body: {
                    studentId: linkForm.studentId,
                    relation: linkForm.relation,
                },
            });
            setLinks((currentLinks) => [
                ...currentLinks.filter(
                    (link) =>
                        !(
                            link.guardianId === guardianId &&
                            link.studentId === linkForm.studentId
                        ),
                ),
                {
                    studentId: linkForm.studentId,
                    guardianId,
                    relation: linkForm.relation,
                },
            ]);
            setLinkOpen(false);
            toastSaved();
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);
        } finally {
            setSavingLink(false);
        }
    }

    async function detach(studentId: string): Promise<void> {
        try {
            await apiJson(
                detachStudent.url({ guardian: guardianId, student: studentId }),
                { method: 'DELETE' },
            );
            setLinks((currentLinks) =>
                currentLinks.filter(
                    (link) =>
                        !(
                            link.guardianId === guardianId &&
                            link.studentId === studentId
                        ),
                ),
            );
            toastRemoved();
        } catch (error) {
            toastApiError(error);
        }
    }

    return (
        <>
            <Head title={fiche.name} />
            <PageShell>
                <header className="flex items-start gap-4">
                    <Users className="text-primary mt-1 size-8 shrink-0" />
                    <div className="min-w-0 space-y-1">
                        <h1 className="text-[22px] font-semibold tracking-tight">
                            {personName(guardian)}
                        </h1>
                        <p className="text-muted-foreground text-[13px]">
                            {guardian.phone} · {guardian.profession} ·{' '}
                            {fiche.childrenCount}{' '}
                            {fiche.childrenCount > 1 ? 'enfants' : 'enfant'}
                        </p>
                    </div>
                </header>

                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[15px] font-semibold">Identité</h2>
                        <Button type="button" onClick={openEdit}>
                            Modifier
                        </Button>
                    </div>
                    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
                        <InfoField label="Nom" value={guardian.lastName} />
                        <InfoField label="Prénom" value={guardian.firstName} />
                        <InfoField label="Téléphone" value={guardian.phone} />
                        <InfoField
                            label="Profession"
                            value={guardian.profession}
                        />
                        <InfoField
                            label="Genre"
                            value={genderLabel(guardian.gender)}
                        />
                        <InfoField label="E-mail" value={guardian.email} />
                        <InfoField label="Ville" value={guardian.city} />
                        <InfoField
                            label="Quartier"
                            value={guardian.neighborhood}
                        />
                        <InfoField label="Adresse" value={guardian.address} />
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[15px] font-semibold">Enfants</h2>
                        <Button type="button" onClick={openLink}>
                            <Plus />
                            Lier un élève
                        </Button>
                    </div>
                    <div className="overflow-hidden rounded-[8px] border">
                        {fiche.children.length === 0 ? (
                            <EmptyState
                                icon={GraduationCap}
                                title="Aucun élève lié"
                                description="Liez un élève déjà inscrit. Un tuteur peut avoir plusieurs enfants."
                            />
                        ) : (
                            <Table containerClassName="rounded-none border-0">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Matricule</TableHead>
                                        <TableHead>Élève</TableHead>
                                        <TableHead>Classe</TableHead>
                                        <TableHead>Cycle</TableHead>
                                        <TableHead>Lien</TableHead>
                                        <TableHead className="w-12">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fiche.children.map((child) => (
                                        <TableRow key={child.studentId}>
                                            <TableCell>
                                                <Link
                                                    href={showStudent(
                                                        child.studentId,
                                                        { query },
                                                    )}
                                                    className="hover:text-primary"
                                                >
                                                    <Badge variant="code">
                                                        {child.matricule}
                                                    </Badge>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <PersonCell
                                                    name={child.name}
                                                    hint={child.matricule}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {child.classroom}
                                            </TableCell>
                                            <TableCell>
                                                {child.cycleName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="muted">
                                                    {guardianRelationLabel(
                                                        child.relation,
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <RowMenu
                                                    items={[
                                                        {
                                                            label: 'Voir la fiche de l’élève',
                                                            icon: Eye,
                                                            onSelect: () =>
                                                                router.visit(
                                                                    showStudent(
                                                                        child.studentId,
                                                                        {
                                                                            query,
                                                                        },
                                                                    ),
                                                                ),
                                                        },
                                                        {
                                                            label: 'Gérer les tuteurs de l’élève',
                                                            icon: Users,
                                                            onSelect: () =>
                                                                router.visit(
                                                                    studentGuardians(
                                                                        child.studentId,
                                                                        {
                                                                            query,
                                                                        },
                                                                    ),
                                                                ),
                                                        },
                                                        {
                                                            label: 'Retirer',
                                                            icon: UserMinus,
                                                            destructive: true,
                                                            confirm: {
                                                                title: 'Retirer ce lien ?',
                                                                description: `${child.name} ne sera plus rattaché à ce tuteur.`,
                                                            },
                                                            onSelect: () => {
                                                                void detach(
                                                                    child.studentId,
                                                                );
                                                            },
                                                        },
                                                    ]}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </section>
            </PageShell>

            <FormSheet
                open={identityOpen}
                onOpenChange={setIdentityOpen}
                title="Modifier le tuteur"
                submitLabel="Enregistrer"
                submitting={savingIdentity}
                onSubmit={() => {
                    void saveIdentity();
                }}
            >
                <Field
                    id="lastName"
                    label="Nom"
                    required
                    error={errors.lastName}
                >
                    <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(event) =>
                            patchForm({ lastName: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="firstName"
                    label="Prénom"
                    required
                    error={errors.firstName}
                >
                    <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(event) =>
                            patchForm({ firstName: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="phone"
                    label="Téléphone"
                    required
                    error={errors.phone}
                >
                    <Input
                        id="phone"
                        value={form.phone}
                        onChange={(event) =>
                            patchForm({ phone: event.target.value })
                        }
                    />
                </Field>
                <Field
                    id="profession"
                    label="Profession"
                    required
                    error={errors.profession}
                >
                    <Input
                        id="profession"
                        value={form.profession}
                        onChange={(event) =>
                            patchForm({ profession: event.target.value })
                        }
                    />
                </Field>
                <Field id="gender" label="Genre">
                    <Select
                        value={form.gender || undefined}
                        onValueChange={(value) =>
                            patchForm({ gender: value as Gender })
                        }
                    >
                        <SelectTrigger id="gender" className="w-full">
                            <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="femme">
                                {genderLabel('femme')}
                            </SelectItem>
                            <SelectItem value="homme">
                                {genderLabel('homme')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="email" label="E-mail" error={errors.email}>
                    <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                            patchForm({ email: event.target.value })
                        }
                    />
                </Field>
                <Field id="city" label="Ville">
                    <Input
                        id="city"
                        value={form.city}
                        onChange={(event) =>
                            patchForm({ city: event.target.value })
                        }
                    />
                </Field>
                <Field id="neighborhood" label="Quartier">
                    <Input
                        id="neighborhood"
                        value={form.neighborhood}
                        onChange={(event) =>
                            patchForm({ neighborhood: event.target.value })
                        }
                    />
                </Field>
                <Field id="address" label="Adresse">
                    <Input
                        id="address"
                        value={form.address}
                        onChange={(event) =>
                            patchForm({ address: event.target.value })
                        }
                    />
                </Field>
            </FormSheet>

            <FormSheet
                open={linkOpen}
                onOpenChange={setLinkOpen}
                title="Lier un élève"
                description="Élève déjà inscrit cette année. Pas de nouveau compte parent."
                submitLabel="Lier"
                submitting={savingLink}
                onSubmit={() => {
                    void saveLink();
                }}
            >
                <Field
                    id="studentId"
                    label="Élève"
                    required
                    error={errors.studentId}
                >
                    <SearchSelect
                        id="studentId"
                        className="w-full"
                        value={linkForm.studentId}
                        placeholder="Choisir un élève"
                        searchPlaceholder="Rechercher un élève..."
                        options={candidates.map((row) => ({
                            value: row.studentId,
                            label: `${row.matricule} — ${row.name}`,
                            keywords: `${row.name} ${row.matricule} ${row.classroom}`,
                        }))}
                        onValueChange={(value) =>
                            patchLinkForm({ studentId: value })
                        }
                    />
                </Field>
                <Field
                    id="relation"
                    label="Lien"
                    required
                    error={errors.relation}
                >
                    <Select
                        value={linkForm.relation}
                        onValueChange={(value) =>
                            patchLinkForm({
                                relation: value as GuardianRelation,
                            })
                        }
                    >
                        <SelectTrigger id="relation" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {GUARDIAN_RELATIONS.map((relation) => (
                                <SelectItem key={relation} value={relation}>
                                    {guardianRelationLabel(relation)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FormSheet>
        </>
    );
}

GuardianShowPage.layout = {
    breadcrumbs: [
        { title: 'Tuteurs', href: guardians() },
        { title: 'Fiche', href: guardians() },
    ],
};
