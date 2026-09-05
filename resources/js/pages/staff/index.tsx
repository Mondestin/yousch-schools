import { Head } from '@inertiajs/react';
import {
    Clock,
    EllipsisVertical,
    Layers,
    Mail,
    Phone,
    Plus,
    Shield,
    User,
    UserCog,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
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
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    PresenceBadge,
    StaffCycleBadges,
    StaffRoleBadge,
} from '@/components/sms/code-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { crudItems } from '@/lib/school-crud';
import { requiredEmail, requiredText } from '@/lib/school-form';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { formatFrDateTime, formatLastSeen } from '@/lib/school-rows';
import { staffCycleSummary, staffRoleLabel } from '@/lib/school-staff';
import { toastStub } from '@/lib/school-toast';
import { index as staff } from '@/routes/staff';
import type { SchoolDataset, StaffRole, StaffUser } from '@/types/school';

const staffSchema = z.object({
    name: requiredText('Le nom'),
    email: requiredEmail(),
    phone: requiredText('Le téléphone'),
    role: z.string(),
    cycles: z.array(z.string()),
});

export default function StaffIndex({ catalog }: { catalog: SchoolDataset }) {
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<StaffUser[]>(catalog.staffUsers);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<StaffUser | null>(null);
    const allCycles = catalog.cycles.map((item) => item.value);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'secretaire' as StaffRole,
        cycles: allCycles,
    });
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return items.filter((user) =>
            needle === ''
                ? true
                : `${user.name} ${user.email} ${user.phone} ${staffRoleLabel(user.role, catalog.roles)} ${staffCycleSummary(user.cycles, catalog.cycles)}`
                      .toLowerCase()
                      .includes(needle),
        );
    }, [catalog.cycles, catalog.roles, items, search]);
    const table = useClientTable(rows);

    function patchForm(patch: Partial<typeof form>): void {
        clearErrors(Object.keys(patch));
        setForm((current) => ({ ...current, ...patch }));
    }

    function openCreate(): void {
        setEditingId(null);
        setForm({
            name: '',
            email: '',
            phone: '',
            role: 'secretaire',
            cycles: allCycles,
        });
        clearErrors();
        setOpen(true);
    }

    function openEdit(user: StaffUser): void {
        setEditingId(user.id);
        setForm({
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            cycles: user.cycles,
        });
        clearErrors();
        setOpen(true);
    }

    function duplicate(user: StaffUser): void {
        setEditingId(null);
        setForm({
            name: '',
            email: '',
            phone: '',
            role: user.role,
            cycles: user.cycles,
        });
        clearErrors();
        setOpen(true);
    }

    function remove(user: StaffUser): void {
        // No /api/v1/staff (or users) routes in routes/api.php — accounts stay mock-only.
        void user;
        toastStub(
            'Les comptes utilisateurs ne sont pas encore disponibles via l’API.',
        );
    }

    function toggleCycle(
        cycle: StaffUser['cycles'][number],
        on: boolean,
    ): void {
        clearErrors('cycles');
        setForm((current) => {
            const cycles = on
                ? current.cycles.includes(cycle)
                    ? current.cycles
                    : [...current.cycles, cycle]
                : current.cycles.filter((item) => item !== cycle);

            return { ...current, cycles };
        });
    }

    function save(): void {
        if (!validate(staffSchema, form)) {
            return;
        }

        if (form.cycles.length === 0) {
            showErrors({ cycles: 'Choisissez au moins un niveau.' });

            return;
        }

        // No /api/v1/staff (or users) routes in routes/api.php — leave as stub.
        setOpen(false);
        toastStub(
            'Les comptes utilisateurs ne sont pas encore disponibles via l’API.',
        );
    }

    return (
        <>
            <Head title="Utilisateurs" />
            <PageShell flush className="overflow-hidden">
                <PageHeader
                    flush
                    title="Utilisateurs"
                    description="Comptes du bureau. Le rôle ouvre les menus ; les niveaux limitent le cycle visible."
                />
                <Alert className="mx-6 mb-4 w-auto">
                    <UserCog />
                    <AlertTitle>Accès selon le rôle et les niveaux</AlertTitle>
                    <AlertDescription>
                        Le menu suit le rôle. Secrétaire : pas de notes.
                        Enseignant : pas de caisse. Admin : sièges d’abonnement.
                        Les niveaux cochés sont les seuls cycles que le compte
                        peut ouvrir.
                    </AlertDescription>
                </Alert>
                <ListPage
                    embedded
                    title="Utilisateurs"
                    icon={UserCog}
                    description="Rôle et niveaux d’accès pour chaque compte."
                    searchPlaceholder="Rechercher nom, e-mail, téléphone, rôle, niveau..."
                    search={search}
                    onSearchChange={setSearch}
                    actions={
                        <Button type="button" size="sm" onClick={openCreate}>
                            <Plus />
                            Ajouter
                        </Button>
                    }
                    empty={{
                        title: search.trim()
                            ? 'Aucun résultat'
                            : 'Aucun utilisateur',
                        description: search.trim()
                            ? undefined
                            : 'Aucun compte staff n’est encore défini.',
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
                                    <DataTableColumnHeader icon={Mail}>
                                        E-mail
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Phone}>
                                        Téléphone
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Shield}>
                                        Rôle
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Layers}>
                                        Niveaux
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Clock}>
                                        Dernière activité
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead className="w-14 text-center">
                                    <DataTableColumnHeader
                                        icon={EllipsisVertical}
                                    >
                                        Actions
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.pageRows.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        <PersonCell name={user.name} />
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.phone}</TableCell>
                                    <TableCell>
                                        <StaffRoleBadge
                                            role={user.role}
                                            label={staffRoleLabel(
                                                user.role,
                                                catalog.roles,
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <StaffCycleBadges
                                            cycles={user.cycles}
                                            options={catalog.cycles}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex flex-col items-start gap-1">
                                            <PresenceBadge
                                                lastSeenAt={user.lastSeenAt}
                                            />
                                            <span className="text-muted-foreground text-[12px]">
                                                {formatLastSeen(
                                                    user.lastSeenAt,
                                                )}
                                            </span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onView: () => setViewing(user),
                                                onEdit: () => openEdit(user),
                                                onDuplicate: () =>
                                                    duplicate(user),
                                                onDelete: () => remove(user),
                                                confirm: {
                                                    title: 'Supprimer le compte ?',
                                                    description: `${user.name} perdra l’accès à YouSchlow.`,
                                                },
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ListPage>
            </PageShell>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                icon={UserCog}
                title={viewing?.name ?? 'Utilisateur'}
                description={viewing?.email}
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Téléphone',
                                  value: viewing.phone,
                              },
                              {
                                  label: 'Rôle',
                                  value: (
                                      <StaffRoleBadge
                                          role={viewing.role}
                                          label={staffRoleLabel(
                                              viewing.role,
                                              catalog.roles,
                                          )}
                                      />
                                  ),
                              },
                              {
                                  label: 'Niveaux',
                                  value: (
                                      <StaffCycleBadges
                                          cycles={viewing.cycles}
                                          options={catalog.cycles}
                                      />
                                  ),
                              },
                              {
                                  label: 'Statut',
                                  value: (
                                      <PresenceBadge
                                          lastSeenAt={viewing.lastSeenAt}
                                      />
                                  ),
                              },
                              {
                                  label: 'Dernière activité',
                                  value: formatLastSeen(viewing.lastSeenAt),
                              },
                              {
                                  label: 'Horodatage',
                                  value: viewing.lastSeenAt
                                      ? formatFrDateTime(viewing.lastSeenAt)
                                      : '—',
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={
                    editingId ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                onSubmit={save}
            >
                <Field id="name" label="Nom" required error={errors.name}>
                    <Input
                        id="name"
                        value={form.name}
                        required
                        onChange={(event) =>
                            patchForm({ name: event.target.value })
                        }
                    />
                </Field>
                <Field id="email" label="E-mail" required error={errors.email}>
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
                <Field
                    id="phone"
                    label="Téléphone"
                    required
                    error={errors.phone}
                >
                    <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        required
                        onChange={(event) =>
                            patchForm({ phone: event.target.value })
                        }
                    />
                </Field>
                <Field id="role" label="Rôle" required>
                    <Select
                        value={form.role}
                        onValueChange={(value) =>
                            patchForm({ role: value as StaffRole })
                        }
                    >
                        <SelectTrigger id="role" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {catalog.roles.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field
                    id="cycles"
                    label="Niveaux"
                    required
                    error={errors.cycles}
                    hint="Le compte ne verra que les élèves, classes et notes de ces cycles."
                >
                    <div className="grid gap-2">
                        {catalog.cycles.map((item) => {
                            const checked = form.cycles.includes(item.value);

                            return (
                                <div
                                    key={item.value}
                                    className="flex items-center gap-2"
                                >
                                    <Checkbox
                                        id={`cycle-${item.value}`}
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                            toggleCycle(
                                                item.value,
                                                value === true,
                                            )
                                        }
                                    />
                                    <Label htmlFor={`cycle-${item.value}`}>
                                        {item.label}
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                </Field>
            </FormSheet>
        </>
    );
}

StaffIndex.layout = {
    breadcrumbs: [{ title: 'Utilisateurs', href: staff() }],
};
