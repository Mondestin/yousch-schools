import { CalendarDays, GitBranch } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSchoolContext } from '@/hooks/use-school-context';
import { anneeQueryFromLabel, SCHOOL_CYCLES } from '@/lib/school-context';
import { schoolDataset } from '@/mocks';
import type { Cycle } from '@/types/school';

export function CycleYearSwitcher() {
    const { cycle, annee, allowedCycles, setContext } = useSchoolContext({
        syncUrl: true,
    });
    const cycles = SCHOOL_CYCLES.filter((item) =>
        allowedCycles.includes(item.value),
    );
    const options = cycles.length > 0 ? cycles : SCHOOL_CYCLES;

    return (
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Select
                value={cycle}
                onValueChange={(value) => {
                    if (!value) {
                        return;
                    }

                    setContext({ cycle: value as Cycle });
                }}
            >
                <SelectTrigger
                    size="sm"
                    aria-label="Cycle"
                    className="w-[7.5rem] min-w-0 sm:w-auto sm:min-w-[10.5rem]"
                >
                    <GitBranch className="text-muted-foreground size-3.5" />
                    <SelectValue className="min-w-0 truncate" />
                </SelectTrigger>
                <SelectContent align="end">
                    {options.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={annee}
                onValueChange={(value) => {
                    if (!value) {
                        return;
                    }

                    setContext({ annee: value });
                }}
            >
                <SelectTrigger
                    size="sm"
                    aria-label="Année académique"
                    className="w-[6.75rem] min-w-0 sm:w-auto sm:min-w-[8.5rem]"
                >
                    <CalendarDays className="text-muted-foreground size-3.5" />
                    <SelectValue className="min-w-0 truncate" />
                </SelectTrigger>
                <SelectContent align="end">
                    {schoolDataset.academicYears.map((year) => (
                        <SelectItem
                            key={year.id}
                            value={anneeQueryFromLabel(year.label)}
                        >
                            {year.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
