import {
    Clock3,
    DoorOpen,
    MapPin,
    Pencil,
    Trash2,
    Users,
    UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    periodLabel,
    slotDisplay,
    subjectTone,
    timetablePeriodsForClassroom,
    weekdayLabel,
    type SubjectTone,
} from '@/lib/school-timetable';
import { cn } from '@/lib/utils';
import type { SchoolDataset, TimetableSlot } from '@/types/school';

const TONE_ACCENT: Record<SubjectTone, string> = {
    purple: 'bg-event-purple',
    blue: 'bg-event-blue',
    teal: 'bg-event-teal',
    green: 'bg-event-green',
    amber: 'bg-event-amber',
    rose: 'bg-event-rose',
};

const TONE_SOFT: Record<SubjectTone, string> = {
    purple: 'bg-event-purple-soft text-event-purple',
    blue: 'bg-event-blue-soft text-event-blue',
    teal: 'bg-event-teal-soft text-event-teal',
    green: 'bg-event-green-soft text-event-green',
    amber: 'bg-event-amber-soft text-event-amber',
    rose: 'bg-event-rose-soft text-event-rose',
};

function DetailRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Clock3;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-[12px]">{label}</p>
                <p className="text-sidebar-foreground text-[14px] leading-snug font-medium">
                    {value}
                </p>
            </div>
        </div>
    );
}

export function TimetableLessonDetails({
    catalog,
    slot,
    open,
    onOpenChange,
    canEdit,
    onEdit,
    onDelete,
}: {
    catalog: SchoolDataset;
    slot: TimetableSlot | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canEdit: boolean;
    onEdit: (slot: TimetableSlot) => void;
    onDelete?: (slot: TimetableSlot) => void;
}) {
    if (!slot) {
        return null;
    }

    const display = slotDisplay(catalog, slot);
    const tone = subjectTone(catalog, slot.subjectId);
    const periods = timetablePeriodsForClassroom(catalog, slot.classroomId);
    const classroom = catalog.classrooms.find(
        (item) => item.id === slot.classroomId,
    );
    const time = periodLabel(slot.periodId, periods);
    const day = weekdayLabel(slot.weekday);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-md">
                <div className={cn('h-1.5 w-full', TONE_ACCENT[tone])} />
                <DialogHeader className="space-y-3 px-6 pt-5 pb-0 text-left">
                    <div
                        className={cn(
                            'inline-flex w-fit rounded-md px-2 py-1 text-[12px] font-semibold',
                            TONE_SOFT[tone],
                        )}
                    >
                        Cours
                    </div>
                    <DialogTitle className="text-[22px] leading-tight font-semibold tracking-tight">
                        {display.subjectName}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-[13px]">
                        Détails du créneau dans l’emploi du temps.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-5">
                    <DetailRow icon={Clock3} label="Horaire" value={`${day} · ${time}`} />
                    <DetailRow
                        icon={UserRound}
                        label="Enseignant"
                        value={display.teacherName}
                    />
                    <DetailRow
                        icon={Users}
                        label="Classe"
                        value={classroom?.name ?? '—'}
                    />
                    <DetailRow
                        icon={display.room ? MapPin : DoorOpen}
                        label="Lieu"
                        value={display.room?.trim() || 'Non renseigné'}
                    />
                </div>

                <DialogFooter className="bg-muted/40 gap-2 border-t px-6 py-4 sm:justify-between">
                    {canEdit && onDelete ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="text-danger gap-2"
                            onClick={() => {
                                onOpenChange(false);
                                onDelete(slot);
                            }}
                        >
                            <Trash2 className="size-4" />
                            Retirer
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Fermer
                        </Button>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {canEdit && onDelete ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Fermer
                            </Button>
                        ) : null}
                        {canEdit ? (
                            <Button
                                type="button"
                                className="gap-2"
                                onClick={() => {
                                    onOpenChange(false);
                                    onEdit(slot);
                                }}
                            >
                                <Pencil className="size-4" />
                                Modifier
                            </Button>
                        ) : null}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
