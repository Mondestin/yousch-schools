import {
    Check,
    CircleX,
    Clock,
    FileCheck,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { roleLabel } from '@/lib/school-access';
import { attendanceLabel, attendanceVariant } from '@/lib/school-office';
import { cn } from '@/lib/utils';
import { cycleBadgeVariant, cycleLabel, isOnline } from '@/lib/school-rows';
import { staffRoleBadgeVariant } from '@/lib/school-staff';
import {
    assessmentTypeBadgeVariant,
    assessmentTypeLabel,
} from '@/lib/school-students';
import type {
    AssessmentType,
    AttendanceStatus,
    Cycle,
    SchoolDataset,
    StaffRole,
} from '@/types/school';

const ATTENDANCE_ICONS: Record<AttendanceStatus, LucideIcon> = {
    present: Check,
    absent: CircleX,
    retard: Clock,
    excuse: FileCheck,
};

export function AttendanceIcon({
    status,
    className,
}: {
    status: AttendanceStatus;
    className?: string;
}) {
    const Icon = ATTENDANCE_ICONS[status];

    return (
        <Icon
            aria-hidden
            className={cn('size-3.5 shrink-0 text-current', className)}
        />
    );
}

export function AssessmentTypeBadge({ type }: { type: AssessmentType }) {
    return (
        <Badge variant={assessmentTypeBadgeVariant(type)}>
            {assessmentTypeLabel(type)}
        </Badge>
    );
}

export function CodeBadge({ children }: { children: string }) {
    return <Badge variant="code">{children}</Badge>;
}

export function CycleBadge({ cycle }: { cycle: Cycle }) {
    return (
        <Badge variant={cycleBadgeVariant(cycle)}>{cycleLabel(cycle)}</Badge>
    );
}

export function StaffRoleBadge({
    role,
    label,
}: {
    role: StaffRole;
    label?: string;
}) {
    return (
        <Badge variant={staffRoleBadgeVariant(role)}>
            {label ?? roleLabel(role)}
        </Badge>
    );
}

export function StaffCycleBadges({
    cycles,
    options,
}: {
    cycles: Cycle[];
    options: SchoolDataset['cycles'];
}) {
    if (cycles.length === 0) {
        return <Badge variant="muted">Aucun</Badge>;
    }

    if (cycles.length === options.length) {
        return <Badge variant="green">Tous</Badge>;
    }

    return (
        <span className="flex flex-wrap gap-1">
            {options
                .filter((item) => cycles.includes(item.value))
                .map((item) => (
                    <CycleBadge key={item.value} cycle={item.value} />
                ))}
        </span>
    );
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
    return (
        <Badge variant={attendanceVariant(status)}>
            <AttendanceIcon status={status} />
            {attendanceLabel(status)}
        </Badge>
    );
}

export function PresenceBadge({ lastSeenAt }: { lastSeenAt: string | null }) {
    const online = isOnline(lastSeenAt);

    return (
        <Badge variant={online ? 'success' : 'muted'}>
            {online ? 'En ligne' : 'Hors ligne'}
        </Badge>
    );
}

export function TrackBadge({ code }: { code: string | null }) {
    if (!code) {
        return <span className="text-muted-foreground">-</span>;
    }

    return <CodeBadge>{code}</CodeBadge>;
}
