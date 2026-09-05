import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { contextQuery } from '@/lib/school-context';
import type { Cycle, CycleYearFilter, SchoolContext } from '@/types/school';

type ContextPatch = Partial<Pick<SchoolContext, 'cycle' | 'annee'>>;

export function useSchoolContext(options?: {
    syncUrl?: boolean;
}): SchoolContext & {
    query: { cycle: Cycle; annee: string };
    filter: CycleYearFilter;
    setContext: (next: ContextPatch) => void;
} {
    const page = usePage();
    const context = page.props.schoolContext;
    const query = contextQuery(context);
    const filter = useMemo<CycleYearFilter>(
        () => ({
            cycle: context.cycle,
            academicYearId: context.academicYearId,
        }),
        [context.academicYearId, context.cycle],
    );

    function setContext(next: ContextPatch): void {
        const url = new URL(page.url, window.location.origin);

        router.get(
            url.pathname,
            {
                cycle: next.cycle ?? context.cycle,
                annee: next.annee ?? context.annee,
            },
            {
                replace: true,
                preserveState: true,
                preserveScroll: true,
            },
        );
    }

    useEffect(() => {
        if (!options?.syncUrl) {
            return;
        }

        const url = new URL(page.url, window.location.origin);

        if (
            url.searchParams.get('cycle') === context.cycle &&
            url.searchParams.get('annee') === context.annee
        ) {
            return;
        }

        router.get(
            url.pathname,
            {
                cycle: context.cycle,
                annee: context.annee,
            },
            {
                replace: true,
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, [context.annee, context.cycle, options?.syncUrl, page.url]);

    return {
        ...context,
        query,
        filter,
        setContext,
    };
}
