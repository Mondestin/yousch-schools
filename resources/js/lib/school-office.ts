import { personName, todayIso } from '@/lib/school-rows';
import {
    periodLabel,
    slotDisplay,
    timetablePeriodsForClassroom,
} from '@/lib/school-timetable';
import type {
    AnnouncementAudience,
    AttendanceStatus,
    CashKind,
    CycleYearFilter,
    InventoryCondition,
    InventoryItem,
    InventoryStatus,
    SchoolDataset,
    TimetableSlot,
} from '@/types/school';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
    'present',
    'absent',
    'retard',
    'excuse',
];

export function attendanceLabel(status: AttendanceStatus): string {
    if (status === 'present') {
        return 'Présent';
    }

    if (status === 'absent') {
        return 'Absent';
    }

    if (status === 'retard') {
        return 'Retard';
    }

    return 'Excusé';
}

export function attendanceVariant(
    status: AttendanceStatus,
): 'success' | 'danger' | 'warning' | 'blue' {
    if (status === 'present') {
        return 'success';
    }

    if (status === 'absent') {
        return 'danger';
    }

    if (status === 'retard') {
        return 'warning';
    }

    return 'blue';
}

export function attendanceToneClass(status: AttendanceStatus): string {
    if (status === 'present') {
        return 'border-success/20 bg-success-soft text-success hover:bg-success-soft hover:text-success';
    }

    if (status === 'absent') {
        return 'border-danger/20 bg-danger-soft text-danger hover:bg-danger-soft hover:text-danger';
    }

    if (status === 'retard') {
        return 'border-warning/20 bg-warning-soft text-warning hover:bg-warning-soft hover:text-warning';
    }

    return 'border-event-blue-line bg-event-blue-soft text-event-blue hover:bg-event-blue-soft hover:text-event-blue';
}

function sameAttendanceSlot(
    mark: {
        enrollmentId: string;
        date: string;
        periodId: string | null;
        slotId: string | null;
    },
    enrollmentId: string,
    date: string,
    slot: TimetableSlot,
): boolean {
    if (mark.enrollmentId !== enrollmentId || mark.date !== date) {
        return false;
    }

    if (mark.slotId) {
        return mark.slotId === slot.id;
    }

    return (mark.periodId ?? null) === slot.periodId;
}

export function classroomRoll(
    catalog: SchoolDataset,
    classroomId: string,
    date: string,
    slot: TimetableSlot,
) {
    const classroom = catalog.classrooms.find(
        (item) => item.id === classroomId,
    );
    const display = slotDisplay(catalog, slot);

    return catalog.enrollments
        .filter(
            (enrollment) =>
                enrollment.classroomId === classroomId &&
                enrollment.status === 'inscrit',
        )
        .map((enrollment) => {
            const student = catalog.students.find(
                (item) => item.id === enrollment.studentId,
            );
            const mark = catalog.attendance.find((item) =>
                sameAttendanceSlot(item, enrollment.id, date, slot),
            );

            return {
                enrollmentId: enrollment.id,
                studentId: enrollment.studentId,
                matricule: student?.matricule ?? '-',
                name: student ? personName(student) : enrollment.studentId,
                photoUrl: student?.photoUrl ?? null,
                classroomName: classroom?.name ?? '-',
                subjectName: display.subjectName,
                periodLabel: periodLabel(
                    slot.periodId,
                    timetablePeriodsForClassroom(catalog, classroomId),
                ),
                room: display.room ?? '-',
                teacherName: display.teacherName,
                status: mark?.status ?? null,
                note: mark?.note ?? null,
                documentUrl: mark?.documentUrl ?? null,
                documentName: mark?.documentName ?? null,
                markId: mark?.id ?? null,
            };
        });
}

export const INVENTORY_CONDITIONS: InventoryCondition[] = [
    'bon',
    'use',
    'hors_service',
];

export const INVENTORY_STATUSES: InventoryStatus[] = [
    'en_service',
    'en_stock',
    'en_reparation',
    'reforme',
];

export function inventoryConditionLabel(condition: InventoryCondition): string {
    if (condition === 'bon') {
        return 'Bon';
    }

    if (condition === 'use') {
        return 'Usé';
    }

    return 'Hors service';
}

export function inventoryConditionVariant(
    condition: InventoryCondition,
): 'success' | 'warning' | 'danger' {
    if (condition === 'bon') {
        return 'success';
    }

    if (condition === 'use') {
        return 'warning';
    }

    return 'danger';
}

export function inventoryStatusLabel(status: InventoryStatus): string {
    if (status === 'en_service') {
        return 'En service';
    }

    if (status === 'en_stock') {
        return 'En stock';
    }

    if (status === 'en_reparation') {
        return 'En réparation';
    }

    return 'Réformé';
}

export function inventoryStatusVariant(
    status: InventoryStatus,
): 'success' | 'secondary' | 'warning' | 'muted' {
    if (status === 'en_service') {
        return 'success';
    }

    if (status === 'en_stock') {
        return 'secondary';
    }

    if (status === 'en_reparation') {
        return 'warning';
    }

    return 'muted';
}

/** An item is low on stock once it drops to or below its reorder threshold. */
export function isLowStock(item: InventoryItem): boolean {
    return item.status !== 'reforme' && item.quantity < item.minQuantity;
}

export function inventoryValue(item: InventoryItem): number {
    return item.quantity * item.unitCost;
}

/**
 * Next reference for a category, e.g. « INF-2026-004 ».
 */
export function nextInventoryReference(
    items: InventoryItem[],
    category: string,
    now = new Date(),
): string {
    const prefix = (category.trim() || 'GEN')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 3)
        .toUpperCase()
        .padEnd(3, 'X');
    const year = now.getFullYear();
    const taken = items.filter((item) =>
        item.reference.startsWith(`${prefix}-${year}-`),
    ).length;

    return `${prefix}-${year}-${String(taken + 1).padStart(3, '0')}`;
}

export function cashKindLabel(kind: CashKind): string {
    return kind === 'entree' ? 'Entrée' : 'Sortie';
}

export function cashBalance(catalog: SchoolDataset): number {
    return catalog.cashMovements.reduce((sum, item) => {
        return item.kind === 'entree' ? sum + item.amount : sum - item.amount;
    }, 0);
}

export const ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = [
    'tous',
    'parents',
    'eleves',
    'personnel',
];

export function announcementAudienceLabel(
    audience: AnnouncementAudience,
): string {
    if (audience === 'parents') {
        return 'Parents';
    }

    if (audience === 'personnel') {
        return 'Personnel';
    }

    if (audience === 'eleves') {
        return 'Élèves';
    }

    return 'Tous';
}

export function isAnnouncementExpired(
    announcement: { expiresOn: string | null },
    today = todayIso(),
): boolean {
    return announcement.expiresOn !== null && announcement.expiresOn < today;
}

export function classroomsForOffice(
    catalog: SchoolDataset,
    filter: CycleYearFilter,
) {
    return catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
}

export function guardianChildren(
    catalog: SchoolDataset,
    guardianId: string,
    academicYearId: string,
) {
    return catalog.studentGuardians
        .filter((link) => link.guardianId === guardianId)
        .map((link) => {
            const student = catalog.students.find(
                (item) => item.id === link.studentId,
            );
            const enrollment = catalog.enrollments.find(
                (item) =>
                    item.studentId === link.studentId &&
                    item.academicYearId === academicYearId,
            );
            const classroom = enrollment
                ? catalog.classrooms.find(
                      (item) => item.id === enrollment.classroomId,
                  )
                : null;

            return student
                ? {
                      student,
                      name: personName(student),
                      relation: link.relation,
                      classroomName: classroom?.name ?? '-',
                  }
                : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function cashMethodLabel(
    method: 'especes' | 'mobile_money' | 'virement',
): string {
    if (method === 'especes') {
        return 'Espèces';
    }

    if (method === 'mobile_money') {
        return 'Mobile money';
    }

    return 'Virement';
}
