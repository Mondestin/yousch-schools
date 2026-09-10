import { Head, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CircleDot,
    ClipboardCheck,
    Clock,
    FileText,
    GraduationCap,
    Hash,
    Paperclip,
    PenLine,
    School,
    User,
    Users,
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
import { SignaturePad } from '@/components/sms/signature-pad';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ApiError, apiData } from '@/lib/api';
import { requiredText } from '@/lib/school-form';
import { classroomRoll, classroomsForOffice } from '@/lib/school-office';
import { cycleLabel, todayIso } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import {
    lessonOptionLabel,
    lessonsOnDate,
    slotDisplay,
    timetablePeriodsForClassroom,
    weekdayFromIso,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';
import { upsert as upsertAttendance } from '@/routes/api/v1/attendance';
import {
    sign as signAttendance,
    upsert as upsertStaffAttendance,
} from '@/routes/api/v1/staff-attendance';
import { index as attendance } from '@/routes/attendance';
import type { Auth } from '@/types/auth';
import type {
    AttendanceMark,
    AttendanceSession,
    AttendanceStatus,
    SchoolDataset,
    StaffAttendanceMark,
    Teacher,
} from '@/types/school';

function currentTimeHm(now = new Date()): string {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const MAX_JUSTIFICATIF_BYTES = 5 * 1024 * 1024;

const excuseSchema = z.object({
    note: requiredText('Le motif'),
});

type AttendanceTab = 'eleves' | 'enseignants';

type ExcuseDraft = {
    enrollmentId: string;
    name: string;
    note: string;
    documentUrl: string | null;
    documentName: string | null;
};

type StaffExcuseDraft = {
    teacherId: string;
    name: string;
    note: string;
};

type StaffRollRow = {
    teacherId: string;
    code: string;
    name: string;
    photoUrl: string | null;
    position: string | null;
    status: AttendanceStatus | null;
    note: string | null;
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

function teacherName(teacher: Teacher): string {
    return `${teacher.lastName} ${teacher.firstName}`.trim();
}

function AttendancePageTabs({
    tab,
    onTabChange,
    showTeachers,
}: {
    tab: AttendanceTab;
    onTabChange: (next: AttendanceTab) => void;
    showTeachers: boolean;
}) {
    if (!showTeachers) {
        return null;
    }

    const items: { id: AttendanceTab; title: string; icon: typeof User }[] = [
        { id: 'eleves', title: 'Élèves', icon: GraduationCap },
        { id: 'enseignants', title: 'Enseignants', icon: Users },
    ];

    return (
        <nav
            className="border-border after:from-background relative flex shrink-0 overflow-x-auto border-b px-6 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-linear-to-l after:to-transparent md:after:hidden"
            aria-label="Sections"
        >
            {items.map((item) => {
                const active = tab === item.id;
                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onTabChange(item.id)}
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
    );
}

export default function AttendanceIndex({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { filter, academicYearLabel, staffRole } = useSchoolContext();
    const isPrivileged =
        staffRole === 'admin' || staffRole === 'directeur';
    const canManageStaffAttendance = isPrivileged;
    const currentTeacher =
        catalog.teachers.find((item) => item.email === auth.user.email) ?? null;
    const [tab, setTab] = useState<AttendanceTab>('eleves');
    const classrooms = classroomsForOffice(catalog, filter);
    const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? '');
    const [slotId, setSlotId] = useState('');
    const [date, setDate] = useState(todayIso());
    const [staffDate, setStaffDate] = useState(todayIso());
    const [search, setSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [marks, setMarks] = useState<AttendanceMark[]>(catalog.attendance);
    const [staffMarks, setStaffMarks] = useState<StaffAttendanceMark[]>(
        catalog.staffAttendance ?? [],
    );
    const [sessions, setSessions] = useState<AttendanceSession[]>(
        catalog.attendanceSessions ?? [],
    );
    const [excuse, setExcuse] = useState<ExcuseDraft | null>(null);
    const [staffExcuse, setStaffExcuse] = useState<StaffExcuseDraft | null>(
        null,
    );
    const [signOpen, setSignOpen] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [signing, setSigning] = useState(false);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const [staffSaving, setStaffSaving] = useState(false);
    const [nowHm, setNowHm] = useState(() => currentTimeHm());
    const today = todayIso();
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
        const tick = () => setNowHm(currentTimeHm());
        tick();
        const id = window.setInterval(tick, 30_000);

        return () => window.clearInterval(id);
    }, []);

    const period = useMemo(() => {
        if (!slot) {
            return null;
        }

        return periods.find((item) => item.id === slot.periodId) ?? null;
    }, [periods, slot]);

    const inPeriodWindow = Boolean(
        period && nowHm >= period.startsAt && nowHm <= period.endsAt,
    );

    const sessionSigned = useMemo(() => {
        if (!slotId) {
            return false;
        }

        return sessions.some(
            (session) =>
                session.date === date &&
                session.slotId === slotId &&
                session.signatureData &&
                (currentTeacher == null ||
                    session.teacherId === currentTeacher.id),
        );
    }, [currentTeacher, date, sessions, slotId]);

    const ownsSlot =
        isPrivileged ||
        (currentTeacher != null &&
            slot != null &&
            slot.teacherId === currentTeacher.id);

    const canMutateStudents =
        isPrivileged ||
        (ownsSlot && date === today && inPeriodWindow && sessionSigned);

    const needsSignatureCta =
        !isPrivileged &&
        ownsSlot &&
        date === today &&
        inPeriodWindow &&
        !sessionSigned &&
        Boolean(slot);

    const mutateBlockedReason = useMemo(() => {
        if (canMutateStudents || !slot) {
            return null;
        }

        if (!isPrivileged && !ownsSlot) {
            return 'Vous n’êtes pas l’enseignant de ce créneau.';
        }

        if (date !== today) {
            return 'Vous ne pouvez marquer les présences que le jour même. Consultation seule.';
        }

        if (!inPeriodWindow) {
            return 'L’appel n’est possible que pendant le créneau horaire du cours.';
        }

        if (!sessionSigned) {
            return 'Signez d’abord votre présence pour démarrer l’appel.';
        }

        return null;
    }, [
        canMutateStudents,
        date,
        inPeriodWindow,
        isPrivileged,
        ownsSlot,
        sessionSigned,
        slot,
        today,
    ]);

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

    useEffect(() => {
        if (!canManageStaffAttendance && tab === 'enseignants') {
            setTab('eleves');
        }
    }, [canManageStaffAttendance, tab]);

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

    const staffSource = useMemo((): StaffRollRow[] => {
        const marksByTeacher = new Map(
            staffMarks
                .filter((mark) => mark.date === staffDate)
                .map((mark) => [mark.teacherId, mark]),
        );

        return catalog.teachers
            .filter((teacher) => teacher.status === 'actif')
            .map((teacher) => {
                const mark = marksByTeacher.get(teacher.id) ?? null;

                return {
                    teacherId: teacher.id,
                    code: teacher.code,
                    name: teacherName(teacher),
                    photoUrl: teacher.photoUrl,
                    position: teacher.position,
                    status: mark?.status ?? null,
                    note: mark?.note ?? null,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }, [catalog.teachers, staffDate, staffMarks]);

    const staffRows = useMemo(() => {
        const needle = staffSearch.trim().toLowerCase();

        if (needle === '') {
            return staffSource;
        }

        return staffSource.filter((row) =>
            `${row.code} ${row.name} ${row.position ?? ''}`
                .toLowerCase()
                .includes(needle),
        );
    }, [staffSearch, staffSource]);
    const staffTable = useClientTable(staffRows);

    async function confirmSign(): Promise<void> {
        if (!slot || !signatureData) {
            toast.error('Dessinez votre signature avant de valider.');

            return;
        }

        setSigning(true);

        try {
            const saved = await apiData<AttendanceSession>(
                signAttendance.url(),
                {
                    method: 'POST',
                    body: {
                        date,
                        slotId: slot.id,
                        signatureData,
                        status: 'present',
                    },
                },
            );

            setSessions((current) => {
                const others = current.filter(
                    (session) =>
                        !(
                            session.date === saved.date &&
                            session.slotId === saved.slotId &&
                            session.teacherId === saved.teacherId
                        ),
                );

                return [...others, saved];
            });
            setSignOpen(false);
            setSignatureData(null);
            toastSaved('Appel signé');
        } catch (error) {
            toastApiError(error);
        } finally {
            setSigning(false);
        }
    }

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

        if (!canMutateStudents) {
            toast.error(
                mutateBlockedReason ??
                    'Vous ne pouvez pas modifier l’appel pour ce créneau.',
            );

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

    async function persistStaffMarks(
        markRows: {
            teacherId: string;
            status: AttendanceStatus;
            note: string | null;
        }[],
        successMessage?: string,
    ): Promise<boolean> {
        if (markRows.length === 0) {
            return false;
        }

        setStaffSaving(true);

        try {
            const saved = await apiData<StaffAttendanceMark[]>(
                upsertStaffAttendance.url(),
                {
                    method: 'PUT',
                    body: {
                        date: staffDate,
                        marks: markRows.map((mark) => ({
                            teacherId: mark.teacherId,
                            status: mark.status,
                            note: mark.note,
                        })),
                    },
                },
            );

            setStaffMarks((current) => {
                const touched = new Set(saved.map((item) => item.teacherId));
                const others = current.filter(
                    (item) =>
                        !(
                            item.date === staffDate &&
                            touched.has(item.teacherId)
                        ),
                );

                return [...others, ...saved];
            });
            toastSaved(successMessage ?? 'Présences enseignants enregistrées');

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
            setStaffSaving(false);
        }
    }

    function chooseStatus(
        row: (typeof source)[number],
        status: AttendanceStatus,
    ): void {
        if (!canMutateStudents) {
            toast.error(
                mutateBlockedReason ??
                    'Vous ne pouvez pas modifier l’appel pour ce créneau.',
            );

            return;
        }

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

    function chooseStaffStatus(
        row: StaffRollRow,
        status: AttendanceStatus,
    ): void {
        if (status === 'excuse') {
            clearErrors();
            setStaffExcuse({
                teacherId: row.teacherId,
                name: row.name,
                note: row.note ?? '',
            });

            return;
        }

        void persistStaffMarks(
            [
                {
                    teacherId: row.teacherId,
                    status,
                    note: null,
                },
            ],
            'Présence enseignant enregistrée',
        );
    }

    async function markAllPresent(): Promise<void> {
        if (!slot || !canMutateStudents) {
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

    async function markAllStaffPresent(): Promise<void> {
        await persistStaffMarks(
            staffSource.map((row) => ({
                teacherId: row.teacherId,
                status: 'present' as AttendanceStatus,
                note: null,
            })),
            'Tous les enseignants présents',
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

    async function confirmStaffExcuse(): Promise<void> {
        if (!staffExcuse) {
            return;
        }

        if (!validate(excuseSchema, staffExcuse)) {
            return;
        }

        const note = staffExcuse.note.trim();
        const ok = await persistStaffMarks(
            [
                {
                    teacherId: staffExcuse.teacherId,
                    status: 'excuse',
                    note,
                },
            ],
            'Absence enseignant excusée',
        );

        if (ok) {
            setStaffExcuse(null);
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

    const onTeachersTab = tab === 'enseignants' && canManageStaffAttendance;
    const pageDescription = onTeachersTab
        ? `${cycleLabel(filter.cycle)} · ${academicYearLabel}. Présences enseignants.`
        : lessonHint
          ? `${cycleLabel(filter.cycle)} · ${academicYearLabel}. Appel du créneau ${lessonHint}.`
          : `${cycleLabel(filter.cycle)} · ${academicYearLabel}. Appel selon l’emploi du temps du jour.`;

    return (
        <>
            <Head title="Présences" />
            <PageShell flush className="overflow-hidden">
                <PageHeader
                    flush
                    title="Présences"
                    description={pageDescription}
                    actions={
                        onTeachersTab ? (
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        staffSource.length === 0 || staffSaving
                                    }
                                    onClick={() => {
                                        void markAllStaffPresent();
                                    }}
                                >
                                    Tous présents
                                </Button>
                                <Button
                                    type="button"
                                    disabled={
                                        staffSource.length === 0 || staffSaving
                                    }
                                    onClick={() => {
                                        void persistStaffMarks(
                                            staffSource
                                                .filter(
                                                    (row) =>
                                                        row.status !== null,
                                                )
                                                .map((row) => ({
                                                    teacherId: row.teacherId,
                                                    status: row.status as AttendanceStatus,
                                                    note: row.note,
                                                })),
                                            'Présences enseignants enregistrées',
                                        );
                                    }}
                                >
                                    {staffSaving
                                        ? 'Enregistrement…'
                                        : 'Enregistrer l’appel'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {needsSignatureCta ? (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setSignatureData(null);
                                            setSignOpen(true);
                                        }}
                                    >
                                        <PenLine className="size-3.5" />
                                        Signer mon appel
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        !rollReady || !canMutateStudents
                                    }
                                    onClick={() => {
                                        void markAllPresent();
                                    }}
                                >
                                    Tous présents
                                </Button>
                                <Button
                                    type="button"
                                    disabled={
                                        !rollReady ||
                                        saving ||
                                        !canMutateStudents
                                    }
                                    onClick={() => {
                                        void persistMarks(
                                            source
                                                .filter(
                                                    (row) =>
                                                        row.status !== null,
                                                )
                                                .map((row) => ({
                                                    enrollmentId:
                                                        row.enrollmentId,
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
                        )
                    }
                />
                <AttendancePageTabs
                    tab={tab}
                    onTabChange={setTab}
                    showTeachers={canManageStaffAttendance}
                />
                {!onTeachersTab && mutateBlockedReason ? (
                    <Alert className="mx-6 mb-4 w-auto">
                        <ClipboardCheck />
                        <AlertTitle>Appel en consultation</AlertTitle>
                        <AlertDescription>
                            {mutateBlockedReason}
                            {needsSignatureCta
                                ? ' Utilisez « Signer mon appel » pour activer la saisie.'
                                : ' Les marques existantes restent visibles.'}
                        </AlertDescription>
                    </Alert>
                ) : null}
                {onTeachersTab ? (
                    <ListPage
                        embedded
                        title="Présences enseignants"
                        icon={Users}
                        description=""
                        searchPlaceholder="Rechercher un enseignant, un code..."
                        search={staffSearch}
                        onSearchChange={setStaffSearch}
                        filters={
                            <div className="w-[13.5rem]">
                                <DatePicker
                                    value={staffDate}
                                    required
                                    onChange={setStaffDate}
                                />
                            </div>
                        }
                        empty={{
                            title: staffSearch.trim()
                                ? 'Aucun résultat'
                                : 'Aucun enseignant actif',
                            description: staffSearch.trim()
                                ? undefined
                                : 'Ajoutez des enseignants actifs pour faire l’appel.',
                        }}
                        paging={staffTable}
                    >
                        <Table containerClassName={DATA_TABLE_CONTAINER}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <DataTableColumnHeader icon={Hash}>
                                            Code
                                        </DataTableColumnHeader>
                                    </TableHead>
                                    <TableHead>
                                        <DataTableColumnHeader icon={User}>
                                            Enseignant
                                        </DataTableColumnHeader>
                                    </TableHead>
                                    <TableHead>
                                        <DataTableColumnHeader icon={School}>
                                            Poste
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
                                {staffTable.pageRows.map((row) => (
                                    <TableRow key={row.teacherId}>
                                        <TableCell>
                                            <CodeBadge>{row.code}</CodeBadge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <PersonCell
                                                name={row.name}
                                                hint={row.code}
                                                photoUrl={row.photoUrl}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {row.position ?? (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.status ? (
                                                <AttendanceBadge
                                                    status={row.status}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <AttendanceSelect
                                                    value={row.status}
                                                    aria-label={`Appel de ${row.name}`}
                                                    onValueChange={(status) =>
                                                        chooseStaffStatus(
                                                            row,
                                                            status,
                                                        )
                                                    }
                                                />
                                                {row.status === 'excuse' ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        aria-label={`Motif de ${row.name}`}
                                                        onClick={() =>
                                                            chooseStaffStatus(
                                                                row,
                                                                'excuse',
                                                            )
                                                        }
                                                    >
                                                        <FileText className="size-3.5" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ListPage>
                ) : (
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
                                            <CodeBadge>
                                                {row.matricule}
                                            </CodeBadge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <PersonCell
                                                name={row.name}
                                                hint={row.matricule}
                                                photoUrl={row.photoUrl}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {row.classroomName}
                                        </TableCell>
                                        <TableCell>
                                            {row.subjectName}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                {row.periodLabel}
                                                {row.room !== '-' ? (
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
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <AttendanceSelect
                                                    value={row.status}
                                                    disabled={!canMutateStudents}
                                                    aria-label={`Appel de ${row.name}`}
                                                    onValueChange={(status) =>
                                                        chooseStatus(
                                                            row,
                                                            status,
                                                        )
                                                    }
                                                />
                                                {row.status === 'excuse' ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={
                                                            !canMutateStudents
                                                        }
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
                )}
            </PageShell>

            <Dialog
                open={signOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setSignOpen(false);
                        setSignatureData(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Signer mon appel</DialogTitle>
                        <DialogDescription>
                            {lessonHint
                                ? `Signature pour le créneau ${lessonHint}.`
                                : 'Dessinez votre signature pour démarrer l’appel.'}
                        </DialogDescription>
                    </DialogHeader>
                    <SignaturePad onChange={setSignatureData} />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setSignOpen(false);
                                setSignatureData(null);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            disabled={signing || !signatureData}
                            onClick={() => {
                                void confirmSign();
                            }}
                        >
                            {signing ? 'Signature…' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

            <Dialog
                open={staffExcuse !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        clearErrors();
                        setStaffExcuse(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justifier l’absence</DialogTitle>
                        <DialogDescription>
                            {staffExcuse
                                ? `${staffExcuse.name} · motif obligatoire.`
                                : 'Motif obligatoire.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Field
                        id="staffExcuseNote"
                        label="Motif"
                        required
                        error={errors.note}
                    >
                        <Textarea
                            id="staffExcuseNote"
                            value={staffExcuse?.note ?? ''}
                            rows={4}
                            placeholder="Formation, rendez-vous administratif, congé..."
                            onChange={(event) => {
                                clearErrors('note');
                                setStaffExcuse((current) =>
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
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                clearErrors();
                                setStaffExcuse(null);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                void confirmStaffExcuse();
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
