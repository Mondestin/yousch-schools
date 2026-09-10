import type { LucideIcon } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { DataTable, ExportButton } from '@/components/sms/data-table';
import { EmptyState } from '@/components/sms/empty-state';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageToolbar } from '@/components/sms/page-toolbar';
import { SearchInput } from '@/components/sms/search-input';
import { TablePagination } from '@/components/sms/table-pagination';
import type { ClientTable } from '@/hooks/use-client-table';
import { useYearLock } from '@/hooks/use-year-lock';
import {
    downloadExcel,
    downloadTableAsExcel,
    excelFilename,
    type ExcelCell,
} from '@/lib/school-export';
import { toastApiError, toastSaved } from '@/lib/school-toast';

export type ExcelExportData = {
    filename?: string;
    sheetName?: string;
    headers: string[];
    rows: ExcelCell[][];
};

export function ListPage({
    title,
    description,
    icon,
    searchPlaceholder,
    search,
    onSearchChange,
    filters,
    actions,
    children,
    empty,
    from,
    to,
    total,
    page,
    lastPage,
    pageSize,
    onPageChange,
    onPageSizeChange,
    paging,
    onExport,
    excelExport,
    embedded = false,
    allowWhenReadOnly = false,
}: {
    title: string;
    description: string;
    icon?: LucideIcon;
    searchPlaceholder: string;
    search: string;
    onSearchChange: (value: string) => void;
    filters?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    empty?: { title: string; description?: string; icon?: LucideIcon };
    from?: number;
    to?: number;
    total?: number;
    page?: number;
    lastPage?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    paging?: Pick<
        ClientTable<unknown>,
        | 'from'
        | 'to'
        | 'total'
        | 'page'
        | 'lastPage'
        | 'pageSize'
        | 'setPage'
        | 'setPageSize'
    >;
    onExport?: (() => void) | false;
    /** Preferred: full filtered dataset for Excel. Falls back to the visible table. */
    excelExport?: ExcelExportData | (() => ExcelExportData);
    embedded?: boolean;
    /** Keep create actions on past years (e.g. structure / années). */
    allowWhenReadOnly?: boolean;
}) {
    const { locked } = useYearLock({ allowWhenReadOnly });
    const tableRootRef = useRef<HTMLDivElement>(null);
    const count = paging?.total ?? total ?? 0;
    const currentPageSize = paging?.pageSize ?? pageSize ?? 10;
    const setPageSize = paging?.setPageSize ?? onPageSizeChange;

    function exportExcelFromDom(): boolean {
        const table = tableRootRef.current?.querySelector(
            'table[data-slot="table"]',
        );

        if (!(table instanceof HTMLTableElement)) {
            return false;
        }

        return downloadTableAsExcel(
            table,
            excelFilename(title),
            title.slice(0, 31),
        );
    }

    function handleExport(): void {
        if (onExport === false) {
            return;
        }

        if (onExport) {
            onExport();

            return;
        }

        try {
            const data =
                typeof excelExport === 'function' ? excelExport() : excelExport;

            if (data && data.headers.length > 0) {
                downloadExcel(data.filename ?? excelFilename(title), {
                    name: data.sheetName ?? title.slice(0, 31),
                    headers: data.headers,
                    rows: data.rows,
                });
                toastSaved('Export Excel téléchargé');

                return;
            }

            if (count > currentPageSize && setPageSize) {
                const previousSize = currentPageSize;

                flushSync(() => {
                    setPageSize(Math.max(count, previousSize));
                });

                const ok = exportExcelFromDom();

                flushSync(() => {
                    setPageSize(previousSize);
                });

                if (ok) {
                    toastSaved('Export Excel téléchargé');

                    return;
                }
            }

            if (exportExcelFromDom()) {
                toastSaved('Export Excel téléchargé');

                return;
            }

            toastApiError(
                new Error('Aucune donnée à exporter'),
                'Aucune donnée à exporter',
            );
        } catch (error) {
            toastApiError(error, 'Impossible d’exporter en Excel');
        }
    }

    const body = (
        <div ref={tableRootRef} className="flex min-h-0 flex-1 flex-col">
            <DataTable
                toolbar={
                    <PageToolbar
                        search={
                            <SearchInput
                                value={search}
                                onChange={(event) =>
                                    onSearchChange(event.target.value)
                                }
                                aria-label={`Rechercher dans ${title}`}
                                placeholder={searchPlaceholder}
                            />
                        }
                        filters={filters}
                        actions={
                            <>
                                {onExport === false ? null : (
                                    <ExportButton
                                        label="Exporter Excel"
                                        onExport={handleExport}
                                    />
                                )}
                                {locked ? null : actions}
                            </>
                        }
                    />
                }
                empty={
                    count === 0 && empty ? (
                        <EmptyState
                            icon={empty.icon ?? icon}
                            title={empty.title}
                            description={empty.description}
                        />
                    ) : undefined
                }
                footer={
                    <TablePagination
                        from={paging?.from ?? from ?? 0}
                        to={paging?.to ?? to ?? 0}
                        total={count}
                        page={paging?.page ?? page ?? 1}
                        lastPage={paging?.lastPage ?? lastPage ?? 1}
                        pageSize={paging?.pageSize ?? pageSize ?? 10}
                        onPageChange={paging?.setPage ?? onPageChange}
                        onPageSizeChange={
                            paging?.setPageSize ?? onPageSizeChange
                        }
                    />
                }
            >
                {children}
            </DataTable>
        </div>
    );

    if (embedded) {
        return body;
    }

    return (
        <PageShell flush className="overflow-hidden">
            <PageHeader flush title={title} description={description} />
            {body}
        </PageShell>
    );
}
