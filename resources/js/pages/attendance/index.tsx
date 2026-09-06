import { Head } from '@inertiajs/react';
import {
    BookOpen,
    CircleDot,
    ClipboardCheck,
    Clock,
    FileText,
    Hash,
    Paperclip,
    School,
    User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { AttendanceSelect } from '@/components/sms/attendance-select';
import { AttendanceBadge, CodeBadge } from '@/components/sms/code-badge';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { DatePicker } from '@/components/sms/date-picker';
import { Field } from '@/components/sms/field';
import { ListPage } from '@/components/sms/list-page';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PersonCell } from '@/components/sms/person-cell';
import { SearchSelect } from '@/components/sms/search-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { requiredText } from '@/lib/school-form';
import { classroomRoll, classroomsForOffice } from '@/lib/school-office';
import { cycleLabel, todayIso } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { upsert as upsertAttendance } from '@/routes/api/v1/attendance';
import {
    lessonOptionLabel,
    lessonsOnDate,
    slotDisplay,
    timetablePeriodsForClassroom,
    weekdayFromIso,
} from '@/lib/school-timetable';
import { index as attendance } from '@/routes/attendance';
import type {
    AttendanceMark,
    AttendanceStatus,
    SchoolDataset,
} from '@/types/school';

const MAX_JUSTIFICATIF_BYTES = 5 * 1024 * 1024;

const excuseSchema = z.object({
    note: requiredText('Le motif'),
});

type ExcuseDraft = {
    enrollmentId: string;
    name: string;
    note: string;
    documentUrl: string | null;
    documentName: string | null;
};

function isImageDocument(url: string | null): boolean {
    if (!url) {
        return false;
    }

    return (
        url.startsWith('data:image/') ||
        /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)
    );
}

function readJustificatif(file: File): Promise<{ url: string; name: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                reject(new Error('Lecture impossible.'));

                return;
            }

            resolve({ url: reader.result, name: file.name });
        };
        reader.onerror = () =>
            reject(reader.error ?? new Error('Lecture impossible.'));
        reader.readAsDataURL(file);
    });
}

export default function AttendanceIndex({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { filter, academicYearLabel } = useSchoolContext();
    const classrooms = classroomsForOffice(catalog, filter);
    const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? '');
    const [slotId, setSlotId] = useState('');
    const [date, setDate] = useState(todayIso());
    const [search, setSearch] = useState('');
    const [marks, setMarks] = useState<AttendanceMark[]>(catalog.attendance);
    const [excuse, setExcuse] = useState<ExcuseDraft | null>(null);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const weekday = weekdayFromIso(date);
    const periods = useMemo(
        () => timetablePeriodsForClassroom(catalog, classroomId),
        [catalog, classroomId],
    );
    const lessons = useMemo(
        () => lessonsOnDate(catalog.timetableSlots, classroomId, date, periods),
        [catalog.timetableSlots, classroomId, date, periods],
    );
    const slot = lessons.find((item) => item.id === slotId) ?? null;

    useEffect(() => {
        const next = classroomsForOffice(catalog, filter);
        setClassroomId(next[0]?.id ?? '');
        setSearch('');
    }, [catalog, filter.cycle, filter.academicYearId]);

    useEffect(() => {
        const next = lessonsOnDate(
            catalog.timetableSlots,
            classroomId,
            date,
            timetablePeriodsForClassroom(catalog, classroomId),
        );
        setSlotId((current) =>
            next.some((item) => item.id === current)
                ? current
                : (next[0]?.id ?? ''),
        );
        setExcuse(null);
    }, [catalog.timetableSlots, classroomId, date]);

    const working = useMemo(
        () => ({ ...catalog, attendance: marks }),
        [catalog, marks],
    );
    const rollReady = Boolean(classroomId && slot);
    const source = useMemo(() => {
        if (!slot) {
            return [];
        }

        return classroomRoll(working, classroomId, date, slot);
    }, [classroomId, date, slot, working]);
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();

        if (needle === '') {
            return source;
        }

        return source.filter((row) =>
            `${row.matricule} ${row.name} ${row.classroomName} ${row.subjectName} ${row.periodLabel} ${row.room}`
                .toLowerCase()
                .includes(needle),
        );
    }, [search, source]);
    const table = useClientTable(rows);

    async function persistMarks(
        markRows: {
            enrollmentId: string;
            status: AttendanceStatus;
            note: string | null;
            periodId?: string | null;
            subjectId?: string | null;
        }[],
        successMessage?: string,
    ): Promise<boolean> {
        if (!slot || !classroomId || markRows.length === 0) {
            return false;
        }

        setSaving(true);

        try {
            const saved = await apiData<AttendanceMark[]>(
                upsertAttendance.url(),
                {
                    method: 'PUT',
                    body: {
                        date,
                        classroomId,
                        slotId: slot.id,
                        marks: markRows.map((mark) => ({
                            enrollmentId: mark.enrollmentId,
                            status: mark.status,
                            periodId: mark.periodId ?? slot.periodId,
                            subjectId: mark.subjectId ?? slot.subjectId,
                            note: mark.note,
                        })),
                    },
                },
            );

            setMarks((current) => {
                const others = current.filter(
                    (item) =>
                        !(
                            item.date === date &&
                            (item.slotId === slot.id ||
                                (item.periodId ?? null) === slot.periodId)
                        ),
                );

                return [...others, ...saved];
            });
            toastSaved(successMessage);

            return true;
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);

            return false;
        } finally {
            setSaving(false);
        }
    }

    function chooseStatus(
        row: (typeof source)[number],
        status: AttendanceStatus,
    ): void {
        if (status === 'excuse') {
            clearErrors();
            setExcuse({
                enrollmentId: row.enrollmentId,
                name: row.name,
                note: row.note ?? '',
                documentUrl: row.documentUrl,
                documentName: row.documentName,
            });

            return;
        }

        void persistMarks(
            [
                {
                    enrollmentId: row.enrollmentId,
                    status,
                    note: null,
                },
            ],
            'Présence enregistrée',
        );
    }

    async function markAllPresent(): Promise<void> {
        if (!slot) {
            return;
        }

        await persistMarks(
            source.map((row) => ({
                enrollmentId: row.enrollmentId,
                status: 'present' as AttendanceStatus,
                note: null,
            })),
            'Tous présents',
        );
    }

    async function confirmExcuse(): Promise<void> {
        if (!excuse) {
            return;
        }

        if (!validate(excuseSchema, excuse)) {
            return;
        }

        const note = excuse.note.trim();
        const ok = await persistMarks(
            [
                {
                    enrollmentId: excuse.enrollmentId,
                    status: 'excuse',
                    note,
                },
            ],
            'Absence excusée enregistrée',
        );

        if (ok) {
            setExcuse(null);
        }
    }

    async function onJustificatif(file: File | null): Promise<void> {
        if (!excuse) {
            return;
        }

        if (!file) {
            setExcuse({
                ...excuse,
                documentUrl: null,
                documentName: null,
            });

            return;
        }

        if (file.size > MAX_JUSTIFICATIF_BYTES) {
            toast.error('Le fichier ne doit pas dépasser 5 Mo.');

            return;
        }

        const next = await readJustificatif(file);
        setExcuse({
            ...excuse,
            documentUrl: next.url,
            documentName: next.name,
        });
    }

    const emptyTitle = search.trim()
        ? 'Aucun résultat'
        : !weekday
          ? 'Pas de cours ce jour'
          : lessons.length === 0
            ? 'Aucun créneau'
            : 'Aucun élève à appeler';
    const emptyDescription = search.trim()
        ? undefined
        : !weekday
          ? 'L’emploi du temps ne prévoit pas de cours le dimanche.'
          : lessons.length === 0
            ? 'Aucun cours n’est planifié à l’emploi du temps pour cette classe ce jour.'
            : 'Choisissez une classe du cycle, ou inscrivez des élèves.';
    const lessonHint = slot
        ? `${lessonOptionLabel(catalog, slot)} · ${slotDisplay(catalog, slot).teacherName}`
        : null;

    return (
        <>
            <Head title="Présences" />
            <PageShell flush className="overflow-hidden">
                <PageHeader
                    flush
                    title="Présences"
                    description={
                        lessonHint
                            ? `${cycleLabel(filter.cycle)} · ${academicYearLabel}. Appel du créneau ${lessonHint}.`
                            : `${cycleLabel(filter.cycle)} · ${academicYearLabel}. Appel selon l’emploi du temps du jour.`
                    }
                    actions={
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!rollReady}
                                onClick={() => {
                                    void markAllPresent();
                                }}
                            >
                                Tous présents
                            </Button>
                            <Button
                                type="button"
                                disabled={!rollReady || saving}
                                onClick={() => {
                                    void persistMarks(
                                        source
                                            .filter(
                                                (row) => row.status !== null,
                                            )
                                            .map((row) => ({
                                                enrollmentId: row.enrollmentId,
                                                status: row.status as AttendanceStatus,
                                                note: row.note,
                                            })),
                                        'Appel enregistré',
                                    );
                                }}
                            >
                                {saving
                                    ? 'Enregistrement…'
                                    : 'Enregistrer l’appel'}
                            </Button>
                        </div>
                    }
                />
                <ListPage
                    embedded
                    title="Présences"
                    icon={ClipboardCheck}
                    description=""
                    searchPlaceholder="Rechercher un élève, un matricule..."
                    search={search}
                    onSearchChange={setSearch}
                    filters={
                        <>
                            <SearchSelect
                                value={classroomId}
                                onValueChange={(value) => {
                                    setClassroomId(value);
                                    setSearch('');
                                }}
                                className="w-[11rem]"
                                aria-label="Classe"
                                placeholder="Classe"
                                searchPlaceholder="Rechercher une classe..."
                                options={classrooms.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                }))}
                            />
                            <div className="w-[13.5rem]">
                                <DatePicker
                                    value={date}
                                    required
                                    onChange={setDate}
                                />
                            </div>
                            <SearchSelect
                                value={slotId}
                                onValueChange={setSlotId}
                                className="w-[18rem]"
                                aria-label="Créneau"
                                placeholder="Créneau"
                                searchPlaceholder="Rechercher un créneau..."
                                emptyText="Aucun cours ce jour"
                                options={lessons.map((item) => ({
                                    value: item.id,
                                    label: lessonOptionLabel(catalog, item),
                                    keywords: `${item.periodId} ${item.room ?? ''}`,
                                }))}
                            />
                        </>
                    }
                    empty={{
                        title: emptyTitle,
                        description: emptyDescription,
                    }}
                    paging={table}
                >
                    <Table containerClassName={DATA_TABLE_CONTAINER}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <DataTableColumnHeader icon={Hash}>
                                        Matricule
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={User}>
                                        Élève
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={School}>
                                        Classe
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={BookOpen}>
                                        Matière
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={Clock}>
                                        Créneau
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader icon={CircleDot}>
                                        Statut
                                    </DataTableColumnHeader>
                                </TableHead>
                                <TableHead>
                                    <DataTableColumnHeader
                                        icon={ClipboardCheck}
                                    >
                                        Appel
                                    </DataTableColumnHeader>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.pageRows.map((row) => (
                                <TableRow key={row.enrollmentId}>
                                    <TableCell>
                                        <CodeBadge>{row.matricule}</CodeBadge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <PersonCell
                                            name={row.name}
                                            hint={row.matricule}
                                            photoUrl={row.photoUrl}
                                        />
                                    </TableCell>
                                    <TableCell>{row.classroomName}</TableCell>
                                    <TableCell>{row.subjectName}</TableCell>
                                    <TableCell>
                                        <div>
                                            {row.periodLabel}
                                            {row.room !== '—' ? (
                                                <p className="text-muted-foreground text-[12px]">
                                                    {row.room}
                                                </p>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {row.status ? (
                                            <AttendanceBadge
                                                status={row.status}
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <AttendanceSelect
                                                value={row.status}
                                                aria-label={`Appel de ${row.name}`}
                                                onValueChange={(status) =>
                                                    chooseStatus(row, status)
                                                }
                                            />
                                            {row.status === 'excuse' ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    aria-label={`Justificatif de ${row.name}`}
                                                    onClick={() =>
                                                        chooseStatus(
                                                            row,
                                                            'excuse',
                                                        )
                                                    }
                                                >
                                                    {row.documentUrl ? (
                                                        <Paperclip className="size-3.5" />
                                                    ) : (
                                                        <FileText className="size-3.5" />
                                                    )}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ListPage>
            </PageShell>

            <Dialog
                open={excuse !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        clearErrors();
                        setExcuse(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justifier l’absence</DialogTitle>
                        <DialogDescription>
                            {excuse
                                ? `${excuse.name} · motif obligatoire, justificatif facultatif.`
                                : 'Motif obligatoire, justificatif facultatif.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Field
                        id="excuseNote"
                        label="Motif"
                        required
                        error={errors.note}
                    >
                        <Textarea
                            id="excuseNote"
                            value={excuse?.note ?? ''}
                            rows={4}
                            placeholder="Certificat médical, convocation, autorisation parentale..."
                            onChange={(event) => {
                                clearErrors('note');
                                setExcuse((current) =>
                                    current
                                        ? {
                                              ...current,
                                              note: event.target.value,
                                          }
                                        : current,
                                );
                            }}
                        />
                    </Field>
                    <Field
                        id="excuseFile"
                        label="Justificatif"
                        hint="PDF ou image, 5 Mo maximum."
                    >
                        {excuse?.documentUrl &&
                        isImageDocument(excuse.documentUrl) ? (
                            <img
                                src={excuse.documentUrl}
                                alt=""
                                className="mb-2 h-20 rounded-[8px] border object-cover"
                            />
                        ) : null}
                        {excuse?.documentName ? (
                            <p className="text-muted-foreground mb-2 text-[13px]">
                                {excuse.documentName}
                            </p>
                        ) : null}
                        <Input
                            id="excuseFile"
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            onChange={(event) => {
                                void onJustificatif(
                                    event.target.files?.[0] ?? null,
                                );
                            }}
                        />
                        {excuse?.documentUrl ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-1 px-0"
                                onClick={() => void onJustificatif(null)}
                            >
                                Retirer le fichier
                            </Button>
                        ) : null}
                    </Field>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                clearErrors();
                                setExcuse(null);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                void confirmExcuse();
                            }}
                        >
                            Valider
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AttendanceIndex.layout = {
    breadcrumbs: [{ title: 'Présences', href: attendance() }],
};
