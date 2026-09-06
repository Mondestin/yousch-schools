import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TABLE_PAGE_SIZES } from '@/hooks/use-client-table';
import { cn } from '@/lib/utils';

export function TablePagination({
    from = 0,
    to = 0,
    total = 0,
    page = 1,
    lastPage = 1,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
}: {
    from?: number;
    to?: number;
    total?: number;
    page?: number;
    lastPage?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
}) {
    return (
        <div className="text-muted-foreground border-border bg-background flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
                <span>
                    Montrant {from} à {to} sur {total} résultats
                </span>
                <label className="sr-only" htmlFor="table-page-size">
                    Lignes par page
                </label>
                <select
                    id="table-page-size"
                    aria-label="Lignes par page"
                    value={pageSize}
                    className={cn(
                        'border-input bg-background text-foreground h-8 rounded-[8px] border px-2 text-[12px]',
                        'focus-visible:border-primary focus-visible:ring-ring outline-none focus-visible:ring-1',
                    )}
                    onChange={(event) =>
                        onPageSizeChange?.(Number(event.target.value))
                    }
                >
                    {TABLE_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    aria-label="Première page"
                    onClick={() => onPageChange?.(1)}
                >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    aria-label="Page précédente"
                    onClick={() => onPageChange?.(page - 1)}
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-foreground px-2">
                    Page {page} sur {lastPage}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={page >= lastPage}
                    aria-label="Page suivante"
                    onClick={() => onPageChange?.(page + 1)}
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={page >= lastPage}
                    aria-label="Dernière page"
                    onClick={() => onPageChange?.(lastPage)}
                >
                    <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
