import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { DataTable, ExportButton } from '@/components/sms/data-table';
import { EmptyState } from '@/components/sms/empty-state';
import { PageHeader } from '@/components/sms/page-header';
import { PageShell } from '@/components/sms/page-shell';
import { PageToolbar } from '@/components/sms/page-toolbar';
import { SearchInput } from '@/components/sms/search-input';
import { TablePagination } from '@/components/sms/table-pagination';
import type { ClientTable } from '@/hooks/use-client-table';

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
    embedded = false,
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
    embedded?: boolean;
}) {
    const count = paging?.total ?? total ?? 0;
    const body = (
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
                                <ExportButton onExport={onExport} />
                            )}
                            {actions}
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
                    onPageSizeChange={paging?.setPageSize ?? onPageSizeChange}
                />
            }
        >
            {children}
        </DataTable>
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
