import { Head, router } from '@inertiajs/react';
import {
    Ban,
    Briefcase,
    Clock3,
    GraduationCap,
    IdCard,
    LockKeyhole,
    LockOpen,
    Printer,
    ShieldOff,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DEFAULT_ID_CARD_ACCENT,
    ID_CARD_FIELD_LABELS,
    ID_CARD_HEIGHT_MM,
    ID_CARD_WIDTH_MM,
    IdCardPreview,
    orientationForKind,
    type IdCardField,
    type IdCardLayout,
    type IdCardPerson,
} from '@/components/sms/id-card-preview';
import { KpiCard, KpiGrid } from '@/components/sms/kpi-card';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PersonCell } from '@/components/sms/person-cell';
import { RowMenu } from '@/components/sms/row-menu';
import { SearchInput } from '@/components/sms/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSchoolContext } from '@/hooks/use-school-context';
import { ApiError, apiData } from '@/lib/api';
import { printDomElement } from '@/lib/school-export';
import { cycleLabel, formatFrDate, formatFrDateTime, studentRows } from '@/lib/school-rows';
import { teacherRows } from '@/lib/school-staff';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { cn } from '@/lib/utils';
import {
    block as blockCard,
    print as printCard,
    revoke as revokeCard,
    theme as updateTheme,
    unblock as unblockCard,
} from '@/routes/api/v1/identity-cards';
import { index as idCards } from '@/routes/id-cards';
import type {
    IdentityCardRecord,
    IdentityCardStatus,
    SchoolDataset,
    SchoolProfile,
} from '@/types/school';

type Audience = 'students' | 'staff';
type PrivilegedAction = 'block' | 'unblock' | 'revoke';

const STUDENT_FIELDS: IdCardField[] = ['matricule', 'classroom'];
const STAFF_FIELDS: IdCardField[] = ['matricule', 'role'];

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function cardKey(subjectType: 'student' | 'teacher', subjectId: string): string {
    return `${subjectType}:${subjectId}`;
}

function statusLabel(status: IdentityCardStatus, printedAt: string | null): string {
    if (status === 'revoked') {
        return 'Révoquée';
    }

    if (status === 'blocked') {
        return 'Bloquée';
    }

    return printedAt ? 'Imprimée' : 'Non imprimée';
}

function statusVariant(
    status: IdentityCardStatus,
    printedAt: string | null,
): 'success' | 'warning' | 'danger' | 'secondary' {
    if (status === 'revoked') {
        return 'danger';
    }

    if (status === 'blocked') {
        return 'warning';
    }

    return printedAt ? 'success' : 'secondary';
}

export default function IdCardsIndex({ catalog }: { catalog: SchoolDataset }) {
    const { filter, academicYearLabel, staffRole } = useSchoolContext();
    const isAdmin = staffRole === 'admin';
    const canManageStatus =
        staffRole === 'admin' || staffRole === 'directeur';

    const [audience, setAudience] = useState<Audience>('students');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [layout, setLayout] = useState<IdCardLayout>('classic');
    const [accent, setAccent] = useState(
        catalog.profile.idCardAccent || DEFAULT_ID_CARD_ACCENT,
    );
    const [savingTheme, setSavingTheme] = useState(false);
    const [showQr, setShowQr] = useState(true);
    const [visibleFields, setVisibleFields] =
        useState<IdCardField[]>(STUDENT_FIELDS);
    const [cards, setCards] = useState<IdentityCardRecord[]>(
        catalog.identityCards ?? [],
    );
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordAction, setPasswordAction] =
        useState<PrivilegedAction | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSaving, setPasswordSaving] = useState(false);

    const students = useMemo(() => {
        const byId = new Map(catalog.students.map((item) => [item.id, item]));

        return studentRows(catalog, filter).map((row) => {
            const student = byId.get(row.studentId);

            return {
                id: row.studentId,
                subjectType: 'student' as const,
                name: row.name,
                subtitle: row.classroom,
                photoUrl: row.photoUrl,
                hint: row.matricule,
                searchText: `${row.name} ${row.matricule} ${row.classroom}`,
                person: {
                    id: row.studentId,
                    name: row.name,
                    subtitle: row.classroom,
                    photoUrl: row.photoUrl,
                    fields: {
                        matricule: row.matricule,
                        bornOn: student?.bornOn
                            ? formatFrDate(student.bornOn)
                            : undefined,
                        phone: student?.phone ?? undefined,
                        classroom: row.classroom,
                    },
                } satisfies IdCardPerson,
            };
        });
    }, [catalog, filter]);

    const staff = useMemo(
        () =>
            teacherRows(catalog, filter).map((teacher) => ({
                id: teacher.id,
                subjectType: 'teacher' as const,
                name: teacher.name,
                subtitle: teacher.position || teacher.qualification || 'Personnel',
                photoUrl: teacher.photoUrl,
                hint: teacher.code,
                searchText: `${teacher.name} ${teacher.code} ${teacher.position ?? ''}`,
                person: {
                    id: teacher.id,
                    name: teacher.name,
                    subtitle:
                        teacher.position || teacher.qualification || 'Personnel',
                    photoUrl: teacher.photoUrl,
                    fields: {
                        matricule: teacher.code,
                        bornOn: teacher.bornOn
                            ? formatFrDate(teacher.bornOn)
                            : undefined,
                        phone: teacher.phone || undefined,
                        role:
                            teacher.position ||
                            teacher.qualification ||
                            'Enseignant',
                    },
                } satisfies IdCardPerson,
            })),
        [catalog, filter],
    );

    const roster = audience === 'students' ? students : staff;
    const cardKind = audience === 'students' ? 'student' : 'staff';
    const orientation = orientationForKind(cardKind);
    const filtered = useMemo(() => {
        const needle = normalize(search.trim());

        if (needle === '') {
            return roster;
        }

        return roster.filter((item) =>
            normalize(item.searchText).includes(needle),
        );
    }, [roster, search]);

    const activeId =
        selectedId && roster.some((item) => item.id === selectedId)
            ? selectedId
            : (filtered[0]?.id ?? null);

    const previewItem =
        roster.find((item) => item.id === activeId) ?? null;
    const previewPerson = previewItem?.person ?? null;

    const cardRecord = useMemo(() => {
        if (!previewItem) {
            return null;
        }

        return (
            cards.find(
                (card) =>
                    card.subjectType === previewItem.subjectType &&
                    card.subjectId === previewItem.id,
            ) ?? null
        );
    }, [cards, previewItem]);

    const validUntil = useMemo(() => {
        const end = catalog.academicYears.find(
            (year) => year.id === filter.academicYearId,
        )?.endsOn;

        return end ? formatFrDate(end) : '31/07/2027';
    }, [catalog.academicYears, filter.academicYearId]);

    function switchAudience(next: Audience): void {
        setAudience(next);
        setSearch('');
        setSelectedId(null);
        setVisibleFields(next === 'students' ? STUDENT_FIELDS : STAFF_FIELDS);
    }

    function selectOne(id: string): void {
        setSelectedId(id);
    }

    function toggleField(field: IdCardField): void {
        setVisibleFields((current) =>
            current.includes(field)
                ? current.filter((item) => item !== field)
                : [...current, field],
        );
    }

    function upsertCard(next: IdentityCardRecord): void {
        setCards((current) => {
            const index = current.findIndex(
                (card) =>
                    card.subjectType === next.subjectType &&
                    card.subjectId === next.subjectId,
            );

            if (index === -1) {
                return [next, ...current];
            }

            const copy = [...current];
            copy[index] = next;

            return copy;
        });
    }

    async function handlePrint(): Promise<void> {
        const node = document.querySelector<HTMLElement>(
            '[data-print-root="id-card"]',
        );

        if (!node || !previewPerson || !previewItem) {
            return;
        }

        if (cardRecord?.status === 'revoked') {
            toastApiError(
                new Error('Cette carte a été révoquée et ne peut plus être imprimée.'),
            );

            return;
        }

        if (cardRecord?.status === 'blocked') {
            toastApiError(
                new Error('Débloquez la carte avant de l’imprimer.'),
            );

            return;
        }

        const pageSize =
            orientation === 'horizontal'
                ? `${ID_CARD_WIDTH_MM}mm ${ID_CARD_HEIGHT_MM}mm`
                : `${ID_CARD_HEIGHT_MM}mm ${ID_CARD_WIDTH_MM}mm`;

        printDomElement(`Carte · ${previewPerson.name}`, node, { pageSize });

        try {
            const saved = await apiData<IdentityCardRecord>(printCard.url(), {
                method: 'POST',
                body: {
                    subjectType: previewItem.subjectType,
                    subjectId: previewItem.id,
                },
            });
            upsertCard(saved);
            toastSaved('Impression enregistrée');
            router.reload({ only: ['catalog'] });
        } catch (error) {
            toastApiError(error);
        }
    }

    async function saveTheme(nextAccent: string): Promise<void> {
        if (!isAdmin) {
            return;
        }

        setSavingTheme(true);

        try {
            const profile = await apiData<SchoolProfile>(updateTheme.url(), {
                method: 'PUT',
                body: { idCardAccent: nextAccent },
            });
            setAccent(profile.idCardAccent);
            toastSaved('Thème enregistré');
            router.reload({ only: ['catalog'] });
        } catch (error) {
            toastApiError(error);
        } finally {
            setSavingTheme(false);
        }
    }

    function openPasswordAction(action: PrivilegedAction): void {
        setPasswordAction(action);
        setPassword('');
        setPasswordError(null);
        setPasswordOpen(true);
    }

    async function confirmPasswordAction(): Promise<void> {
        if (!previewItem || !passwordAction) {
            return;
        }

        setPasswordSaving(true);
        setPasswordError(null);

        const routeMap = {
            block: blockCard,
            unblock: unblockCard,
            revoke: revokeCard,
        } as const;

        try {
            const saved = await apiData<IdentityCardRecord>(
                routeMap[passwordAction].url(),
                {
                    method: 'POST',
                    body: {
                        subjectType: previewItem.subjectType,
                        subjectId: previewItem.id,
                        password,
                    },
                },
            );
            upsertCard(saved);
            setPasswordOpen(false);
            setPassword('');
            setPasswordAction(null);
            toastSaved();
            router.reload({ only: ['catalog'] });
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (fields.password) {
                    setPasswordError(fields.password);

                    return;
                }
            }

            toastApiError(error);
            setPasswordOpen(false);
        } finally {
            setPasswordSaving(false);
        }
    }

    const fieldOptions = audience === 'students' ? STUDENT_FIELDS : STAFF_FIELDS;
    const cardStats = useMemo(() => {
        const subjectType = audience === 'students' ? 'student' : 'teacher';
        const byId = new Map(
            cards
                .filter((card) => card.subjectType === subjectType)
                .map((card) => [card.subjectId, card]),
        );

        let printed = 0;
        let pending = 0;
        let blocked = 0;
        let revoked = 0;

        for (const person of roster) {
            const card = byId.get(person.id);

            if (!card) {
                pending += 1;
                continue;
            }

            if (card.status === 'revoked') {
                revoked += 1;
            } else if (card.status === 'blocked') {
                blocked += 1;
            } else if (card.printedAt) {
                printed += 1;
            } else {
                pending += 1;
            }
        }

        return {
            total: roster.length,
            printed,
            pending,
            blocked,
            revoked,
        };
    }, [audience, cards, roster]);
    const printStatus = statusLabel(
        cardRecord?.status ?? 'active',
        cardRecord?.printedAt ?? null,
    );
    const printDate = cardRecord?.printedAt
        ? formatFrDateTime(cardRecord.printedAt)
        : '—';

    const menuItems = canManageStatus
        ? [
              ...(cardRecord?.status !== 'blocked' &&
              cardRecord?.status !== 'revoked'
                  ? [
                        {
                            label: 'Bloquer',
                            icon: Ban,
                            onSelect: () => openPasswordAction('block'),
                        },
                    ]
                  : []),
              ...(cardRecord?.status === 'blocked'
                  ? [
                        {
                            label: 'Débloquer',
                            icon: LockOpen,
                            onSelect: () => openPasswordAction('unblock'),
                        },
                    ]
                  : []),
              ...(cardRecord?.status !== 'revoked'
                  ? [
                        {
                            label: 'Révoquer',
                            icon: ShieldOff,
                            destructive: true as const,
                            skipConfirm: true,
                            onSelect: () => openPasswordAction('revoke'),
                        },
                    ]
                  : []),
          ]
        : [];

    return (
        <>
            <Head title="Cartes d’identité" />
            <PageShell flush className="overflow-hidden">
                <PageHeader
                    flush
                    title="Générateur de cartes"
                    description="Sélectionnez une personne, personnalisez le modèle PVC, puis imprimez."
                    icon={IdCard}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                disabled={
                                    !previewPerson ||
                                    cardRecord?.status === 'blocked' ||
                                    cardRecord?.status === 'revoked'
                                }
                                onClick={() => {
                                    void handlePrint();
                                }}
                            >
                                <Printer />
                                Imprimer
                            </Button>
                            {menuItems.length > 0 ? (
                                <RowMenu items={menuItems} />
                            ) : null}
                        </div>
                    }
                />

                <KpiGrid className="shrink-0 gap-3 px-6 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        icon={Users}
                        label={
                            audience === 'students'
                                ? 'Élèves concernés'
                                : 'Enseignants concernés'
                        }
                        value={String(cardStats.total)}
                        hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                    />
                    <KpiCard
                        icon={Printer}
                        label="Imprimées"
                        value={String(cardStats.printed)}
                        hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                    />
                    <KpiCard
                        icon={Clock3}
                        label="À imprimer"
                        value={String(cardStats.pending)}
                        hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                    />
                    <KpiCard
                        icon={Ban}
                        label="Bloquées / révoquées"
                        value={String(
                            cardStats.blocked + cardStats.revoked,
                        )}
                        hint={`${cycleLabel(filter.cycle)} · ${academicYearLabel}`}
                    />
                </KpiGrid>

                <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-6 pt-4 pb-4 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)_minmax(16rem,19rem)]">
                    <section className="border-border flex min-h-0 flex-col overflow-hidden rounded-[12px] border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <nav
                            className="border-border relative flex shrink-0 overflow-x-auto border-b px-3"
                            aria-label="Sections"
                        >
                            {(
                                [
                                    {
                                        id: 'students' as const,
                                        title: 'Élèves',
                                        icon: GraduationCap,
                                    },
                                    {
                                        id: 'staff' as const,
                                        title: 'Personnel',
                                        icon: Briefcase,
                                    },
                                ] as const
                            ).map((item) => {
                                const active = audience === item.id;
                                const Icon = item.icon;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => switchAudience(item.id)}
                                        className={cn(
                                            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors',
                                            active
                                                ? 'border-primary text-primary'
                                                : 'text-muted-foreground hover:text-foreground border-transparent',
                                        )}
                                    >
                                        <Icon className="size-4" />
                                        {item.title}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="border-border shrink-0 border-b p-3">
                            <SearchInput
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                wrapperClassName="max-w-none min-w-0 w-full"
                                placeholder={
                                    audience === 'students'
                                        ? 'Nom, matricule ou classe…'
                                        : 'Nom ou code…'
                                }
                            />
                        </div>

                        <div className="border-border text-muted-foreground flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 text-[12px]">
                            <span>Sélection unique</span>
                            <span>
                                {activeId ? '1 sélectionnée' : 'Aucune'}
                            </span>
                        </div>

                        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            {filtered.length === 0 ? (
                                <li className="text-muted-foreground px-4 py-8 text-center text-[13px]">
                                    Aucune personne trouvée.
                                </li>
                            ) : (
                                filtered.map((item) => {
                                    const active = item.id === activeId;
                                    const record = cards.find(
                                        (card) =>
                                            card.subjectType ===
                                                item.subjectType &&
                                            card.subjectId === item.id,
                                    );

                                    return (
                                        <li key={cardKey(item.subjectType, item.id)}>
                                            <button
                                                type="button"
                                                className={cn(
                                                    'flex w-full items-center gap-2 border-l-2 px-3 py-2.5 text-left transition-colors',
                                                    active
                                                        ? 'border-primary bg-primary/5'
                                                        : 'hover:bg-muted/40 border-transparent',
                                                )}
                                                onClick={() => selectOne(item.id)}
                                            >
                                                <PersonCell
                                                    name={item.name}
                                                    hint={item.hint}
                                                    photoUrl={item.photoUrl}
                                                />
                                                <div className="ml-auto flex flex-col items-end gap-1">
                                                    <p className="text-muted-foreground text-[12px]">
                                                        {item.subtitle}
                                                    </p>
                                                    {record ? (
                                                        <Badge
                                                            variant={statusVariant(
                                                                record.status,
                                                                record.printedAt,
                                                            )}
                                                            className="text-[10px]"
                                                        >
                                                            {statusLabel(
                                                                record.status,
                                                                record.printedAt,
                                                            )}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </section>

                    <section className="border-border flex min-h-0 flex-col overflow-hidden rounded-[12px] border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <div className="border-border flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
                            <div>
                                <p className="text-[14px] font-semibold">
                                    Aperçu de la carte
                                </p>
                                <p className="text-muted-foreground text-[12px]">
                                    Format PVC CR80 ·{' '}
                                    {orientation === 'horizontal'
                                        ? 'horizontale (élèves)'
                                        : 'verticale (enseignants)'}
                                    .
                                </p>
                            </div>
                            <div className="text-right text-[12px]">
                                <p className="text-muted-foreground">Statut d’impression</p>
                                <div className="mt-1 flex items-center justify-end gap-2">
                                    <Badge
                                        variant={statusVariant(
                                            cardRecord?.status ?? 'active',
                                            cardRecord?.printedAt ?? null,
                                        )}
                                    >
                                        {printStatus}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground mt-1">
                                    Date : {printDate}
                                </p>
                            </div>
                        </div>
                        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-white p-6">
                            {previewPerson ? (
                                <IdCardPreview
                                    person={previewPerson}
                                    kind={cardKind}
                                    schoolName={catalog.profile.name}
                                    schoolMotto={catalog.profile.motto}
                                    schoolCity={
                                        catalog.profile.city || 'Brazzaville'
                                    }
                                    schoolLogoUrl={catalog.profile.logoUrl}
                                    yearLabel={academicYearLabel}
                                    accent={accent}
                                    layout={layout}
                                    showQr={showQr}
                                    visibleFields={visibleFields}
                                    validUntil={validUntil}
                                    blocked={cardRecord?.status === 'blocked'}
                                    revoked={cardRecord?.status === 'revoked'}
                                />
                            ) : (
                                <p className="text-muted-foreground text-[13px]">
                                    Sélectionnez une personne pour prévisualiser
                                    sa carte.
                                </p>
                            )}
                        </div>
                    </section>

                    <aside className="border-border flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain rounded-[12px] border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <p className="text-[14px] font-semibold">Réglages</p>

                        <div className="space-y-1.5">
                            <Label htmlFor="card-layout">Disposition</Label>
                            <Select
                                value={layout}
                                onValueChange={(value) =>
                                    setLayout(value as IdCardLayout)
                                }
                            >
                                <SelectTrigger id="card-layout">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classic">
                                        Classique
                                    </SelectItem>
                                    <SelectItem value="split">
                                        Dégradé dynamique
                                    </SelectItem>
                                    <SelectItem value="compact">
                                        Compacte
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-muted-foreground text-[11px]">
                                {audience === 'students'
                                    ? 'Élèves : carte horizontale'
                                    : 'Enseignants : carte verticale type badge'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Options</Label>
                            <label className="flex items-center justify-between gap-3 text-[13px]">
                                <span>Afficher le QR code</span>
                                <Checkbox
                                    checked={showQr}
                                    onCheckedChange={(checked) =>
                                        setShowQr(checked === true)
                                    }
                                />
                            </label>
                        </div>

                        {audience === 'students' ? (
                            <div className="space-y-2">
                                <Label>Champs à afficher</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {fieldOptions.map((field) => {
                                        const active =
                                            visibleFields.includes(field);

                                        return (
                                            <button
                                                key={field}
                                                type="button"
                                                onClick={() =>
                                                    toggleField(field)
                                                }
                                                className={cn(
                                                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                                                    active
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border text-muted-foreground hover:bg-muted/50',
                                                )}
                                            >
                                                {ID_CARD_FIELD_LABELS[field]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <Label>Couleur de la carte</Label>
                            {isAdmin ? (
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="card-accent"
                                        className="text-muted-foreground text-[12px] font-normal"
                                    >
                                        En-tête / bandeau
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="card-accent"
                                            type="color"
                                            value={accent}
                                            disabled={savingTheme}
                                            onChange={(event) =>
                                                setAccent(event.target.value)
                                            }
                                            onBlur={() => {
                                                if (
                                                    /^#[0-9A-Fa-f]{6}$/.test(
                                                        accent,
                                                    ) &&
                                                    accent !==
                                                        (catalog.profile
                                                            .idCardAccent ||
                                                            DEFAULT_ID_CARD_ACCENT)
                                                ) {
                                                    void saveTheme(accent);
                                                }
                                            }}
                                            className="h-10 w-14 cursor-pointer p-1"
                                        />
                                        <Input
                                            value={accent}
                                            disabled={savingTheme}
                                            onChange={(event) =>
                                                setAccent(event.target.value)
                                            }
                                            onBlur={() => {
                                                if (
                                                    /^#[0-9A-Fa-f]{6}$/.test(
                                                        accent,
                                                    ) &&
                                                    accent !==
                                                        (catalog.profile
                                                            .idCardAccent ||
                                                            DEFAULT_ID_CARD_ACCENT)
                                                ) {
                                                    void saveTheme(accent);
                                                }
                                            }}
                                            className="font-mono text-[12px]"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted-foreground flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[12px]">
                                    <span
                                        className="size-5 rounded-full border border-black/5"
                                        style={{ background: accent }}
                                    />
                                    <span className="font-mono">{accent}</span>
                                    <LockKeyhole className="ml-auto size-3.5" />
                                    Admin uniquement
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </PageShell>

            <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LockKeyhole className="size-4" />
                            Confirmer avec le mot de passe
                        </DialogTitle>
                        <DialogDescription>
                            {passwordAction === 'block'
                                ? 'Bloquer cette carte la rend inutilisable jusqu’au déblocage.'
                                : null}
                            {passwordAction === 'unblock'
                                ? 'Débloquer cette carte rétablit son utilisation.'
                                : null}
                            {passwordAction === 'revoke'
                                ? 'Révoquer cette carte est définitif.'
                                : null}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="id-card-password">Mot de passe</Label>
                        <Input
                            id="id-card-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                setPasswordError(null);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void confirmPasswordAction();
                                }
                            }}
                        />
                        {passwordError ? (
                            <p className="text-danger text-[12px]">
                                {passwordError}
                            </p>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPasswordOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            variant={
                                passwordAction === 'revoke'
                                    ? 'destructive'
                                    : 'default'
                            }
                            disabled={passwordSaving || password.trim() === ''}
                            onClick={() => {
                                void confirmPasswordAction();
                            }}
                        >
                            {passwordSaving ? 'Vérification…' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

IdCardsIndex.layout = {
    breadcrumbs: [{ title: 'Cartes d’identité', href: idCards() }],
};
