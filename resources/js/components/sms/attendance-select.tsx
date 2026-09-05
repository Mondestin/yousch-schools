import { AttendanceIcon } from '@/components/sms/code-badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ATTENDANCE_STATUSES,
    attendanceLabel,
    attendanceToneClass,
} from '@/lib/school-office';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/types/school';

export function AttendanceSelect({
    value,
    onValueChange,
    disabled = false,
    'aria-label': ariaLabel = 'Appel',
}: {
    value: AttendanceStatus | null;
    onValueChange: (status: AttendanceStatus) => void;
    disabled?: boolean;
    'aria-label'?: string;
}) {
    return (
        <Select
            value={value ?? undefined}
            onValueChange={(next) => {
                if (ATTENDANCE_STATUSES.includes(next as AttendanceStatus)) {
                    onValueChange(next as AttendanceStatus);
                }
            }}
            disabled={disabled}
        >
            <SelectTrigger
                size="sm"
                aria-label={ariaLabel}
                className={cn(
                    'h-8 min-w-[9.75rem] font-medium',
                    value ? attendanceToneClass(value) : undefined,
                )}
            >
                <SelectValue placeholder="Choisir">
                    {value ? (
                        <span className="flex items-center gap-2">
                            <AttendanceIcon status={value} />
                            {attendanceLabel(value)}
                        </span>
                    ) : null}
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
                {ATTENDANCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                        <AttendanceIcon status={status} />
                        {attendanceLabel(status)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
