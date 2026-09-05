import { Head } from '@inertiajs/react';
import {
    Calendar,
    CalendarClock,
    EllipsisVertical,
    Megaphone,
    MessageSquare,
    Plus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { DetailDialog } from '@/components/sms/detail-dialog';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { ListPage } from '@/components/sms/list-page';
import { RowMenu } from '@/components/sms/row-menu';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { crudItems } from '@/lib/school-crud';
import { requiredDate, requiredText } from '@/lib/school-form';
import {
    ANNOUNCEMENT_AUDIENCES,
    announcementAudienceLabel,
    isAnnouncementExpired,
} from '@/lib/school-office';
import { formatFrDate, todayIso } from '@/lib/school-rows';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import {
    destroy as destroyAnnouncement,
    store as storeAnnouncement,
    update as updateAnnouncement,
} from '@/routes/api/v1/announcements';
import { index as announcements } from '@/routes/announcements';
import { ApiError, apiData, apiJson } from '@/lib/api';
import type {
    Announcement,
    AnnouncementAudience,
    SchoolDataset,
} from '@/types/school';

type AnnouncementForm = {
    title: string;
    body: string;
    audience: AnnouncementAudience;
    publishedOn: string;
    expiresOn: string;
};

function plusDays(iso: string, days: number): string {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    date.setDate(date.getDate() + days);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM: AnnouncementForm = {
    title: '',
    body: '',
    audience: 'tous',
    publishedOn: todayIso(),
    expiresOn: plusDays(todayIso(), 14),
};

const announcementSchema = z
    .object({
        title: requiredText('Le titre'),
        body: requiredText('Le message'),
        publishedOn: requiredDate('La date de publication'),
        expiresOn: z.string(),
    })
    .refine(
        (data) => data.expiresOn === '' || data.expiresOn >= data.publishedOn,
        {
            message:
                'La date d’expiration doit être postérieure à la publication.',
            path: ['expiresOn'],
        },
    );

export default function AnnouncementsIndex({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<Announcement[]>(catalog.announcements);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewing, setViewing] = useState<Announcement | null>(null);
    const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return [...items]
            .sort((left, right) =>
                right.publishedOn.localeCompare(left.publishedOn),
            )
            .filter((item) =>
                needle === ''
                    ? true
                    : `${item.title} ${item.body} ${announcementAudienceLabel(item.audience)}`
                          .toLowerCase()
                          .includes(needle),
            );
    }, [items, search]);
    const table = useClientTable(rows);

    function openCreate(): void {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            publishedOn: todayIso(),
            expiresOn: plusDays(todayIso(), 14),
        });
        clearErrors();
        setOpen(true);
    }

    function openEdit(announcement: Announcement): void {
        setEditingId(announcement.id);
        setForm({
            title: announcement.title,
            body: announcement.body,
            audience: announcement.audience,
            publishedOn: announcement.publishedOn,
            expiresOn: announcement.expiresOn ?? '',
        });
        clearErrors();
        setOpen(true);
    }

    function duplicate(announcement: Announcement): void {
        setEditingId(null);
        setForm({
            title: `${announcement.title} (copie)`,
            body: announcement.body,
            audience: announcement.audience,
            publishedOn: todayIso(),
            expiresOn: announcement.expiresOn ? plusDays(todayIso(), 14) : '',
        });
        clearErrors();
        setOpen(true);
    }

    async function remove(id: string): Promise<void> {
        try {
            await apiJson(destroyAnnouncement.url(id), { method: 'DELETE' });
            setItems((current) => current.filter((item) => item.id !== id));
            toastRemoved('Annonce supprimée');
        } catch (error) {
            toastApiError(error, 'Impossible de supprimer l’annonce');
        }
    }

    function patchForm(next: Partial<AnnouncementForm>): void {
        clearErrors(Object.keys(next));
        setForm((current) => ({ ...current, ...next }));
    }

    async function save(): Promise<void> {
        if (!validate(announcementSchema, form)) {
            return;
        }

        const payload = {
            title: form.title.trim(),
            body: form.body.trim(),
            audience: form.audience,
            publishedOn: form.publishedOn,
            expiresOn: form.expiresOn || null,
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<Announcement>(
                      updateAnnouncement.url(editingId),
                      { method: 'PUT', body: payload },
                  )
                : await apiData<Announcement>(storeAnnouncement.url(), {
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
            <Head title="Annonces" />
            <ListPage
                title="Annonces"
                description="Messages aux parents, aux élèves et au personnel. En production, l’envoi SMS/WhatsApp sera branché ici."
                icon={Megaphone}
                searchPlaceholder="Rechercher une annonce..."
                search={search}
                onSearchChange={setSearch}
                actions={
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus />
                        Publier
                    </Button>
                }
                empty={{
                    title: 'Aucune annonce',
                    description: 'Publiez la première information du bureau.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Calendar}>
                                    Date
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Megaphone}>
                                    Titre
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={Users}>
                                    Destinataires
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={CalendarClock}>
                                    Expiration
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={MessageSquare}>
                                    Message
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
                        {table.pageRows.map((item) => {
                            const expired = isAnnouncementExpired(item);

                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {formatFrDate(item.publishedOn)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {item.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="code">
                                            {announcementAudienceLabel(
                                                item.audience,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {item.expiresOn ? (
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                {formatFrDate(item.expiresOn)}
                                                {expired ? (
                                                    <Badge variant="warning">
                                                        Expirée
                                                    </Badge>
                                                ) : null}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Sans limite
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-md truncate">
                                        {item.body}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-center">
                                        <RowMenu
                                            items={crudItems({
                                                onView: () => setViewing(item),
                                                onEdit: () => openEdit(item),
                                                onDuplicate: () =>
                                                    duplicate(item),
                                                onDelete: () => remove(item.id),
                                                confirm: {
                                                    title: 'Supprimer l’annonce ?',
                                                    description: `« ${item.title} » ne sera plus diffusée aux destinataires.`,
                                                },
                                            })}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </ListPage>

            <DetailDialog
                open={viewing !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setViewing(null);
                    }
                }}
                icon={Megaphone}
                title={viewing?.title ?? 'Annonce'}
                description={
                    viewing
                        ? `Publiée le ${formatFrDate(viewing.publishedOn)}`
                        : undefined
                }
                fields={
                    viewing
                        ? [
                              {
                                  label: 'Destinataires',
                                  value: announcementAudienceLabel(
                                      viewing.audience,
                                  ),
                              },
                              {
                                  label: 'Expiration',
                                  value: viewing.expiresOn
                                      ? `${formatFrDate(viewing.expiresOn)}${
                                            isAnnouncementExpired(viewing)
                                                ? ' · expirée'
                                                : ''
                                        }`
                                      : 'Sans date limite',
                              },
                              {
                                  label: 'Message',
                                  value: viewing.body,
                                  wide: true,
                              },
                          ]
                        : []
                }
            />

            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier l’annonce' : 'Publier une annonce'}
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field id="title" label="Titre" required error={errors.title}>
                    <Input
                        id="title"
                        value={form.title}
                        onChange={(event) =>
                            patchForm({ title: event.target.value })
                        }
                    />
                </Field>
                <Field id="body" label="Message" required error={errors.body}>
                    <Textarea
                        id="body"
                        value={form.body}
                        rows={5}
                        onChange={(event) =>
                            patchForm({ body: event.target.value })
                        }
                    />
                </Field>
                <Field id="audience" label="Destinataires" required>
                    <Select
                        value={form.audience}
                        onValueChange={(value) =>
                            patchForm({
                                audience: value as AnnouncementAudience,
                            })
                        }
                    >
                        <SelectTrigger id="audience" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                                <SelectItem key={audience} value={audience}>
                                    {announcementAudienceLabel(audience)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field
                    id="publishedOn"
                    label="Date de publication"
                    required
                    error={errors.publishedOn}
                >
                    <DatePicker
                        id="publishedOn"
                        value={form.publishedOn}
                        required
                        onChange={(value) => {
                            clearErrors(['publishedOn', 'expiresOn']);
                            patchForm({ publishedOn: value });
                        }}
                    />
                </Field>
                <Field
                    id="expiresOn"
                    label="Date d’expiration"
                    error={errors.expiresOn}
                    hint="Au-delà de cette date, l’annonce n’est plus affichée comme active."
                >
                    <div className="flex gap-2">
                        <DatePicker
                            id="expiresOn"
                            value={form.expiresOn}
                            placeholder="Sans date limite"
                            onChange={(value) =>
                                patchForm({ expiresOn: value })
                            }
                        />
                        {form.expiresOn ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => patchForm({ expiresOn: '' })}
                            >
                                Retirer
                            </Button>
                        ) : null}
                    </div>
                </Field>
            </FormSheet>
        </>
    );
}

AnnouncementsIndex.layout = {
    breadcrumbs: [{ title: 'Annonces', href: announcements() }],
};
