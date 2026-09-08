import { Breadcrumbs } from '@/components/breadcrumbs';
import { CycleYearSwitcher } from '@/components/cycle-year-switcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useYearLock } from '@/hooks/use-year-lock';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { locked, academicYearLabel } = useYearLock();

    return (
        <div className="no-print flex shrink-0 flex-col">
            <header className="border-sidebar-border/50 flex h-14 items-center gap-2 border-b px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:h-16 sm:px-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <div className="hidden min-w-0 overflow-hidden md:block">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
                <CycleYearSwitcher />
            </header>
            {locked ? (
                <div
                    role="status"
                    className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100 border-b px-3 py-2 text-[12px] sm:px-4"
                >
                    Consultation seule · année {academicYearLabel}. Passez à
                    l’année en cours pour ajouter ou modifier des données.
                </div>
            ) : null}
        </div>
    );
}
