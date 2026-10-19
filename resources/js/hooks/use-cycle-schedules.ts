import { useState } from 'react';
import { ApiError, apiData } from '@/lib/api';
import {
    defaultCycleSchedule,
    normalizeSchoolHours,
} from '@/lib/school-timetable';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { upsert as upsertSchedules } from '@/routes/api/v1/school/schedules';
import type { Cycle, CycleSchedule, SchoolDataset } from '@/types/school';

export function useCycleSchedules(catalog: SchoolDataset, cycle: Cycle) {
    const [schedules, setSchedules] = useState<CycleSchedule[]>(() => {
        const byCycle = new Map(
            catalog.schedules.map((item) => [item.cycle, item]),
        );

        return catalog.cycles.map((option) => {
            const item =
                byCycle.get(option.value) ?? defaultCycleSchedule(option.value);

            return {
                ...item,
                hours: normalizeSchoolHours(item.hours),
            };
        });
    });

    const schedule =
        schedules.find((item) => item.cycle === cycle) ??
        defaultCycleSchedule(cycle);

    function patchCurrent(
        write: (schedule: CycleSchedule) => CycleSchedule,
    ): void {
        setSchedules((current) => {
            const previous =
                current.find((item) => item.cycle === cycle) ??
                defaultCycleSchedule(cycle);
            const updated = write(previous);

            if (!current.some((item) => item.cycle === cycle)) {
                return [...current, updated];
            }

            return current.map((item) =>
                item.cycle === cycle ? updated : item,
            );
        });
    }

    async function persistSchedule(
        next: CycleSchedule,
        options?: { successMessage?: string; silent?: boolean },
        onFieldErrors?: (fields: Record<string, string>) => void,
    ): Promise<boolean> {
        try {
            const saved = await apiData<CycleSchedule[]>(
                upsertSchedules.url(),
                {
                    method: 'PUT',
                    body: {
                        schedules: [
                            {
                                cycle: next.cycle,
                                hours: next.hours,
                                periods: next.periods,
                            },
                        ],
                    },
                },
            );

            setSchedules((current) => {
                const byCycle = new Map(
                    saved.map((item) => [
                        item.cycle,
                        {
                            ...item,
                            hours: normalizeSchoolHours(item.hours),
                        },
                    ]),
                );

                return current.map((item) => byCycle.get(item.cycle) ?? item);
            });

            if (!options?.silent) {
                toastSaved(options?.successMessage);
            }

            return true;
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    onFieldErrors?.(fields);
                }
            }

            toastApiError(error);

            return false;
        }
    }

    return {
        schedules,
        schedule,
        patchCurrent,
        persistSchedule,
    };
}
