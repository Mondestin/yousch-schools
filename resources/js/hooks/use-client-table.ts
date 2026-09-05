import { useMemo, useState } from 'react';

export const TABLE_PAGE_SIZES = [10, 20, 50] as const;

export type ClientTable<T> = {
    pageRows: T[];
    from: number;
    to: number;
    total: number;
    page: number;
    lastPage: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
};

export function useClientTable<T>(
    rows: T[],
    defaultPageSize = 10,
): ClientTable<T> {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const total = rows.length;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, lastPage);

    return useMemo(() => {
        const start = total === 0 ? 0 : (safePage - 1) * pageSize;

        return {
            pageRows: rows.slice(start, start + pageSize),
            from: total === 0 ? 0 : start + 1,
            to: start + Math.min(pageSize, total - start),
            total,
            page: safePage,
            lastPage,
            pageSize,
            setPage,
            setPageSize: (size: number) => {
                setPageSize(size);
                setPage(1);
            },
        };
    }, [lastPage, pageSize, rows, safePage, total]);
}
