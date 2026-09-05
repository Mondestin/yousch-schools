import { Head, Link, router } from '@inertiajs/react';
import {
    Briefcase,
    EllipsisVertical,
    Phone,
    Plus,
    User,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonCell } from '@/components/sms/person-cell';
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
import { useSchoolContext } from '@/hooks/use-school-context';
import { crudItems } from '@/lib/school-crud';
import { guardianPersonSchema } from '@/lib/school-form';
import { guardianRows } from '@/lib/school-rows';
import { genderLabel } from '@/lib/school-students';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroyGuardian,
    store as storeGuardian,
    update as updateGuardian,
} from '@/routes/api/v1/guardians';
import { index as guardians, show } from '@/routes/guardians';
import type { Gender, Guardian, SchoolDataset } from '@/types/school';

export default function GuardiansIndex({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { query } = useSchoolContext();
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<Guardian[]>(catalog.guardians);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [form, setForm] = useState({
        lastName: '',
        firstName: '',
        phone: '',
        profession: '',
        gender: 'homme' as Gender,
        email: '',
        city: catalog.profile.city,
        neighborhood: '',
        address: '',
    });

    function patchForm(next: Partial<typeof form>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    const catalogForRows = useMemo(
        () => ({ ...catalog, guardians: items }),
        [catalog, items],
    );
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return guardianRows(catalogForRows).filter((row) =>
            needle === ''
                ? true
                : `${row.lastName} ${row.firstName} ${row.phone} ${row.profession}`
                      .toLowerCase()
                      .includes(needle),
        );
    }, [catalogForRows, search]);
    const table = useClientTable(rows);

    function openCreate(): void {
        setEditingId(null);
        setForm({
            lastName: '',
            firstName: '',
            phone: '',
            profession: '',
            gender: 'homme',
            email: '',
            city: catalog.profile.city,
            neighborhood: '',
            address: '',
        });
        clearErrors();
        setOpen(true);
    }

    function openEdit(id: string): void {
        const guardian = items.find((item) => item.id === id);

        if (!guardian) {
            return;
        }

        setEditingId(id);
        setForm({
            lastName: guardian.lastName,
            firstName: guardian.firstName,
            phone: guardian.phone,
            profession: guardian.profession,
            gender: guardian.gender ?? 'homme',
            email: guardian.email ?? '',
            city: guardian.city ?? catalog.profile.city,
            neighborhood: guardian.neighborhood ?? '',
            address: guardian.address ?? '',
        });
        clearErrors();
        setOpen(true);
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyGuardian.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Tuteur supprimé');
        } catch (error) {
            toastApiError(error);
        }
    }

    async function save(): Promise<void> {
        if (!validate(guardianPersonSchema, form)) {
            return;
        }

        const payload = {
            lastName: form.lastName.trim(),
            firstName: form.firstName.trim(),
            phone: form.phone.trim(),
            profession: form.profession.trim(),
            gender: form.gender,
            email: form.email.trim() || null,
            city: form.city.trim() || null,
            neighborhood: form.neighborhood.trim() || null,
            address: form.address.trim() || null,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Guardian>(updateGuardian.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<Guardian>(storeGuardian.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setItems((current) =>
                editingId
                    ? current.map((item) =>
                          item.id === editingId ? saved : item,
                      )
                    : [saved, ...current],
            );
            setOpen(false);
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
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Tuteurs" />
            <ListPage
                title="Tuteurs"
                icon={Users}
                description="Un tuteur peut être lié à plusieurs élèves. Dossier pour le secrétariat."
                searchPlaceholder="Rechercher nom ou téléphone..."
                search={search}
                onSearchChange={setSearch}
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Ajouter
                    </Button>
                }
                empty={{
                    title: search.trim() ? 'Aucun résultat' : 'Aucun tuteur',
                    description: search.trim()
                        ? undefined
                        : 'Ajoutez un tuteur pour le lier ensuite à un élève.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Nom
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Prénom
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Phone}>
                                    Téléphone
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Briefcase}>
                                    Profession
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Users}>
                                    Enfants
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead className="w-14 text-center">
                                <DataTableColumnHeader icon={EllipsisVertical}>
                                    Actions
                                </DataTableColumnHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                    {row.id.startsWith('gd-local-') ? (
                                        <PersonCell
                                            name={row.name}
                                            label={row.lastName}
                                        />
                                    ) : (
                                        <Link
                                            href={show(row.id, { query })}
                                            className="hover:text-primary"
                                        >
                                            <PersonCell
                                                name={row.name}
                                                label={row.lastName}
                                            />
                                        </Link>
                                    )}
                                </TableCell>
                                <TableCell>{row.firstName}</TableCell>
                                <TableCell>{row.phone}</TableCell>
                                <TableCell>{row.profession}</TableCell>
                                <TableCell>{row.childrenCount}</TableCell>
                                <TableCell className="px-3 py-1.5 text-center">
                                    <RowMenu
                                        items={crudItems({
                                            onView: row.id.startsWith(
                                                'gd-local-',
                                            )
                                                ? undefined
                                                : () => {
                                                      router.visit(
                                                          show(row.id, {
                                                              query,
                                                          }),
                                                      );
                                                  },
                                            onEdit: () => openEdit(row.id),
                                            onDelete: () => {
                                                void remove(row.id);
                                            },
                                            confirm: {
                                                title: 'Supprimer le tuteur ?',
                                                description: `${row.firstName} ${row.lastName} sera détaché des élèves qui lui sont rattachés.`,
                                            },
                                        })}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier le tuteur' : 'Nouveau tuteur'}
                description="Téléphone et adresse pour convocation et relance des frais."
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
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
                        value={form.gender}
                        onValueChange={(value) =>
                            patchForm({ gender: value as Gender })
                        }
                    >
                        <SelectTrigger id="gender" className="w-full">
                            <SelectValue />
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
        </>
    );
}

GuardiansIndex.layout = {
    breadcrumbs: [{ title: 'Tuteurs', href: guardians() }],
};
