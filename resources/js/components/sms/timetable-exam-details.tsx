import { CalendarDays, Clock3, DoorOpen, Pencil, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatFrDate } from '@/lib/school-rows';
import { assessmentTypeLabel } from '@/lib/school-students';
import { assessmentTimeRange } from '@/lib/school-timetable';
import type { Assessment, SchoolDataset } from '@/types/school';

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

export function TimetableExamDetails({
    catalog,
    exam,
    open,
    onOpenChange,
}: {
    catalog: SchoolDataset;
    exam: Assessment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!exam) {
        return null;
    }

    const classroom = catalog.classrooms.find(
        (item) => item.id === exam.classroomId,
    );
    const subject = catalog.subjects.find((item) => item.id === exam.subjectId);
    const term = catalog.terms.find((item) => item.id === exam.termId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-md">
                <div className="bg-warning h-1.5 w-full" />
                <DialogHeader className="space-y-3 px-6 pt-5 pb-0 text-left">
                    <div className="bg-warning-soft text-warning inline-flex w-fit rounded-md px-2 py-1 text-[12px] font-semibold">
                        {assessmentTypeLabel(exam.type)}
                    </div>
                    <DialogTitle className="text-[22px] leading-tight font-semibold tracking-tight">
                        {exam.name}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-[13px]">
                        Évaluation planifiée dans l’emploi du temps.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-5">
                    <DetailRow
                        icon={CalendarDays}
                        label="Date"
                        value={formatFrDate(exam.heldOn)}
                    />
                    <DetailRow
                        icon={Clock3}
                        label="Horaire"
                        value={assessmentTimeRange(exam)}
                    />
                    <DetailRow
                        icon={Pencil}
                        label="Matière"
                        value={subject?.name ?? '—'}
                    />
                    <DetailRow
                        icon={Users}
                        label="Classe"
                        value={classroom?.name ?? '—'}
                    />
                    <DetailRow
                        icon={DoorOpen}
                        label="Période"
                        value={term?.name ?? '—'}
                    />
                </div>

                <DialogFooter className="bg-muted/40 border-t px-6 py-4 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
