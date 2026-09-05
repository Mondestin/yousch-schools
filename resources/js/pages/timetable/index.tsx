import { Head } from '@inertiajs/react';
import { isSameDay, isSameMonth } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/sms/confirm-dialog';
import { EmptyState } from '@/components/sms/empty-state';
import { Field } from '@/components/sms/field';
import { FormSheet } from '@/components/sms/form-sheet';
import { PageShell } from '@/components/sms/page-shell';
import { TimetableHeader } from '@/components/sms/timetable-header';
import { TimetableMonth } from '@/components/sms/timetable-month';
import { TimetableWeek } from '@/components/sms/timetable-week';
import { SearchSelect } from '@/components/sms/search-select';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import { requiredText } from '@/lib/school-form';
import { classroomSubjects } from '@/lib/school-grades';
import { cycleLabel } from '@/lib/school-rows';
import { venueKindLabel } from '@/lib/school-structure';
import { toastApiError, toastRemoved, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData, apiJson } from '@/lib/api';
import {
    destroy as destroySlot,
    store as storeSlot,
    update as updateSlot,
} from '@/routes/api/v1/timetable-slots';
import {
    assessmentsOnDate,
    classroomsForTimetable,
    formatDayHeading,
    periodLabel,
    schoolMonthWeeks,
    schoolWeekDays,
    shiftCalendarDate,
    slotConflict,
    timetablePeriodsForClassroom,
    type TimetableView,
    visibleLessonCount,
    WEEKDAYS,
} from '@/lib/school-timetable';
import { index as timetable } from '@/routes/timetable';
import type { SchoolDataset, TimetableSlot, Weekday } from '@/types/school';

type SlotForm = {
    classroomId: string;
    weekday: Weekday;
    periodId: string;
    subjectId: string;
    teacherId: string;
    room: string;
};

function blankForm(
    classroomId: string,
    catalog: SchoolDataset,
    weekday: Weekday = 'lundi',
    periodId?: string,
): SlotForm {
    const classroom = catalog.classrooms.find(
        (item) => item.id === classroomId,
    );
    const subjects = classroom ? classroomSubjects(catalog, classroom) : [];
    const teachers = catalog.teachers.filter(
        (teacher) => teacher.status === 'actif',
    );

    return {
        classroomId,
        weekday,
        periodId:
            periodId ??
            timetablePeriodsForClassroom(catalog, classroomId)[0]?.id ??
            'p1',
        subjectId: subjects[0]?.id ?? '',
        teacherId: teachers[0]?.id ?? '',
        room: '',
    };
}

const slotSchema = z.object({
    classroomId: requiredText('La classe'),
    weekday: requiredText('Le jour'),
    periodId: requiredText('L’horaire'),
    subjectId: requiredText('La matière'),
    teacherId: requiredText('L’enseignant'),
    room: z.string(),
});

export default function TimetableIndex({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    const { filter, academicYearLabel } = useSchoolContext();
    const classrooms = useMemo(
        () => classroomsForTimetable(catalog, filter),
        [catalog, filter],
    );
    const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? '');
    const [slots, setSlots] = useState<TimetableSlot[]>(catalog.timetableSlots);
    const [cursor, setCursor] = useState(() => new Date());
    const [view, setView] = useState<TimetableView>('week');
    const [open, setOpen] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<SlotForm>(() =>
        blankForm(classrooms[0]?.id ?? '', catalog),
    );
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setClassroomId(classrooms[0]?.id ?? '');
    }, [filter.cycle, filter.academicYearId, classrooms]);

    const classroom = classrooms.find((item) => item.id === classroomId);
    const formClassroom =
        classrooms.find((item) => item.id === form.classroomId) ?? classroom;
    const periods = timetablePeriodsForClassroom(
        catalog,
        form.classroomId || classroomId,
    );
    const subjects = formClassroom
        ? classroomSubjects(catalog, formClassroom)
        : [];
    const teachers = catalog.teachers.filter(
        (teacher) => teacher.status === 'actif',
    );
    const availableVenues = useMemo(
        () =>
            catalog.venues.filter(
                (venue) => venue.available || venue.name === form.room,
            ),
        [catalog.venues, form.room],
    );
    const weekDays = schoolWeekDays(cursor);
    const monthDays = schoolMonthWeeks(cursor).flat();
    const visibleDays =
        view === 'day'
            ? weekDays.filter((day) => isSameDay(day, cursor)).length > 0
                ? weekDays.filter((day) => isSameDay(day, cursor))
                : [weekDays[0]!]
            : weekDays;
    const countDays =
        view === 'month'
            ? monthDays.filter((day) => isSameMonth(day, cursor))
            : view === 'day'
              ? visibleDays
              : weekDays;
    const eventCount = classroom
        ? visibleLessonCount(slots, classroom.id, countDays) +
          countDays.reduce(
              (total, day) =>
                  total + assessmentsOnDate(catalog, classroom.id, day).length,
              0,
          )
        : 0;

    function openCreate(weekday?: Weekday, periodId?: string): void {
        if (!classroomId) {
            toast.error('Choisissez une classe.');

            return;
        }

        setEditingId(null);
        setForm(blankForm(classroomId, catalog, weekday, periodId));
        clearErrors();
        setOpen(true);
    }

    function openEdit(slot: TimetableSlot): void {
        setEditingId(slot.id);
        setForm({
            classroomId: slot.classroomId,
            weekday: slot.weekday,
            periodId: slot.periodId,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
            room: slot.room ?? '',
        });
        clearErrors();
        setOpen(true);
    }

    function patchForm(patch: Partial<SlotForm>): void {
        clearErrors(Object.keys(patch));
        setForm((current) => ({ ...current, ...patch }));
    }

    async function save(): Promise<void> {
        if (!validate(slotSchema, form)) {
            return;
        }

        const draft = {
            id: editingId ?? 'ts-draft',
            classroomId: form.classroomId,
            weekday: form.weekday,
            periodId: form.periodId,
            teacherId: form.teacherId,
        };
        const conflict = slotConflict(slots, draft);

        if (conflict === 'classroom') {
            showErrors({
                classroomId: 'Cette classe a déjà un cours à cet horaire.',
            });

            return;
        }

        if (conflict === 'teacher') {
            showErrors({
                teacherId: 'Cet enseignant a déjà un cours à cet horaire.',
            });

            return;
        }

        const payload = {
            academicYearId: filter.academicYearId,
            classroomId: form.classroomId,
            weekday: form.weekday,
            periodId: form.periodId,
            subjectId: form.subjectId,
            teacherId: form.teacherId,
            room: form.room.trim() === '' ? null : form.room.trim(),
        };

        setSaving(true);

        try {
            const saved = editingId
                ? await apiData<TimetableSlot>(updateSlot.url(editingId), {
                      method: 'PUT',
                      body: payload,
                  })
                : await apiData<TimetableSlot>(storeSlot.url(), {
                      method: 'POST',
                      body: payload,
                  });

            setSlots((current) =>
                editingId
                    ? current.map((slot) =>
                          slot.id === editingId ? saved : slot,
                      )
                    : [...current, saved],
            );
            setClassroomId(form.classroomId);
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

    async function remove(): Promise<void> {
        if (!editingId) {
            return;
        }

        try {
            await apiJson(destroySlot.url(editingId), { method: 'DELETE' });
            setSlots((current) =>
                current.filter((slot) => slot.id !== editingId),
            );
            setOpen(false);
            toastRemoved('Créneau retiré');
        } catch (error) {
            toastApiError(error);
        }
    }

    return (
        <>
            <Head title="Emploi du temps" />
            <PageShell className="overflow-hidden">
                <div className="border-border bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border">
                    <TimetableHeader
                        date={cursor}
                        view={view}
                        eventCount={eventCount}
                        onViewChange={setView}
                        onShift={(direction) =>
                            setCursor((current) =>
                                shiftCalendarDate(current, view, direction),
                            )
                        }
                        onToday={() => setCursor(new Date())}
                        onAdd={() => openCreate()}
                        filters={
                            <SearchSelect
                                value={classroomId}
                                onValueChange={setClassroomId}
                                className="w-[170px]"
                                aria-label="Classe"
                                placeholder="Classe"
                                searchPlaceholder="Rechercher une classe..."
                                disabled={classrooms.length === 0}
                                options={classrooms.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                }))}
                            />
                        }
                    />

                    <div className="text-muted-foreground hidden border-b px-4 py-2 text-[13px] print:block">
                        {catalog.profile.name} · {classroom?.name} ·{' '}
                        {academicYearLabel} · {cycleLabel(filter.cycle)}
                    </div>

                    {!classroom ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="Aucune classe sur ce cycle"
                            description="Créez une classe dans Structure, ou changez de cycle."
                        />
                    ) : view === 'month' ? (
                        <TimetableMonth
                            catalog={catalog}
                            classroomId={classroom.id}
                            slots={slots}
                            cursor={cursor}
                            onSelectDay={(day) => {
                                setCursor(day);
                                setView('day');
                            }}
                            onCreate={openCreate}
                            onEdit={openEdit}
                        />
                    ) : (
                        <>
                            {view === 'day' ? (
                                <h2 className="border-border shrink-0 border-b px-4 py-3 text-base font-semibold">
                                    {formatDayHeading(visibleDays[0]!)}
                                </h2>
                            ) : null}
                            <div className="min-h-0 flex-1 overflow-auto">
                                <TimetableWeek
                                    catalog={catalog}
                                    classroomId={classroom.id}
                                    slots={slots}
                                    days={visibleDays}
                                    onSelectDay={(day) => {
                                        setCursor(day);
                                        setView('day');
                                    }}
                                    onCreate={openCreate}
                                    onEdit={openEdit}
                                />
                            </div>
                        </>
                    )}
                </div>
            </PageShell>
            <FormSheet
                open={open}
                onOpenChange={setOpen}
                title={editingId ? 'Modifier le créneau' : 'Ajouter un créneau'}
                description={
                    formClassroom
                        ? `Cours pour ${formClassroom.name} · ${cycleLabel(filter.cycle)}.`
                        : 'Choisissez la classe concernée.'
                }
                submitLabel={editingId ? 'Enregistrer' : 'Créer'}
                submitting={saving}
                onSubmit={() => {
                    void save();
                }}
            >
                <Field
                    id="classroomId"
                    label="Classe"
                    required
                    error={errors.classroomId}
                >
                    <SearchSelect
                        id="classroomId"
                        className="w-full"
                        value={form.classroomId}
                        placeholder="Choisir une classe"
                        searchPlaceholder="Rechercher une classe..."
                        options={classrooms.map((item) => ({
                            value: item.id,
                            label: item.name,
                        }))}
                        onValueChange={(value) => {
                            const nextClassroom = catalog.classrooms.find(
                                (item) => item.id === value,
                            );
                            const nextSubjects = nextClassroom
                                ? classroomSubjects(catalog, nextClassroom)
                                : [];
                            const nextSubjectId = nextSubjects.some(
                                (subject) => subject.id === form.subjectId,
                            )
                                ? form.subjectId
                                : (nextSubjects[0]?.id ?? '');

                            patchForm({
                                classroomId: value,
                                subjectId: nextSubjectId,
                            });
                        }}
                    />
                </Field>
                <Field
                    id="weekday"
                    label="Jour"
                    required
                    error={errors.weekday}
                >
                    <Select
                        value={form.weekday}
                        onValueChange={(value) =>
                            patchForm({ weekday: value as Weekday })
                        }
                    >
                        <SelectTrigger id="weekday">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {WEEKDAYS.map((day) => (
                                <SelectItem key={day.id} value={day.id}>
                                    {day.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field
                    id="periodId"
                    label="Horaire"
                    required
                    error={errors.periodId}
                >
                    <Select
                        value={form.periodId}
                        onValueChange={(value) =>
                            patchForm({ periodId: value })
                        }
                    >
                        <SelectTrigger id="periodId">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {periods.map((period) => (
                                <SelectItem key={period.id} value={period.id}>
                                    {periodLabel(period.id, periods)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field
                    id="subjectId"
                    label="Matière"
                    required
                    error={errors.subjectId}
                >
                    <Select
                        value={form.subjectId}
                        onValueChange={(value) =>
                            patchForm({ subjectId: value })
                        }
                    >
                        <SelectTrigger id="subjectId">
                            <SelectValue placeholder="Matière" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field
                    id="teacherId"
                    label="Enseignant"
                    required
                    error={errors.teacherId}
                >
                    <Select
                        value={form.teacherId}
                        onValueChange={(value) =>
                            patchForm({ teacherId: value })
                        }
                    >
                        <SelectTrigger id="teacherId">
                            <SelectValue placeholder="Enseignant" />
                        </SelectTrigger>
                        <SelectContent>
                            {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.lastName} {teacher.firstName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field id="room" label="Salle">
                    <Select
                        value={form.room === '' ? 'none' : form.room}
                        onValueChange={(value) =>
                            patchForm({
                                room: value === 'none' ? '' : value,
                            })
                        }
                    >
                        <SelectTrigger id="room" className="w-full">
                            <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            {availableVenues.map((venue) => (
                                <SelectItem key={venue.id} value={venue.name}>
                                    {venue.name} · {venueKindLabel(venue.kind)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                {editingId ? (
                    <Button
                        type="button"
                        variant="outline"
                        className="text-danger"
                        onClick={() => setConfirmRemove(true)}
                    >
                        Retirer le créneau
                    </Button>
                ) : null}
            </FormSheet>

            <ConfirmDialog
                open={confirmRemove}
                onOpenChange={setConfirmRemove}
                onConfirm={remove}
                title="Retirer ce créneau ?"
                description="Le cours sera retiré de l’emploi du temps de cette classe."
                confirmLabel="Retirer"
            />
        </>
    );
}

TimetableIndex.layout = {
    breadcrumbs: [{ title: 'Emploi du temps', href: timetable() }],
};
