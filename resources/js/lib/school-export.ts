/** Client-side download / print helpers for table export actions. */

export type ExcelCell = string | number | boolean | null | undefined;

export type ExcelSheet = {
    name?: string;
    headers: string[];
    rows: ExcelCell[][];
};

function escapeXml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function cellXml(value: ExcelCell): string {
    if (value === null || value === undefined || value === '') {
        return '<Cell/>';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
    }

    if (typeof value === 'boolean') {
        return `<Cell><Data ss:Type="Boolean">${value ? 1 : 0}</Data></Cell>`;
    }

    return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function sheetXml(sheet: ExcelSheet): string {
    const name = escapeXml((sheet.name ?? 'Données').slice(0, 31));
    const header = `<Row>${sheet.headers.map((header) => cellXml(header)).join('')}</Row>`;
    const body = sheet.rows
        .map((row) => `<Row>${row.map((cell) => cellXml(cell)).join('')}</Row>`)
        .join('');

    return `<Worksheet ss:Name="${name}"><Table>${header}${body}</Table></Worksheet>`;
}

export function downloadTextFile(
    filename: string,
    content: string,
    mime = 'text/plain;charset=utf-8',
): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

/** Excel-compatible SpreadsheetML (.xls) — opens in Excel and LibreOffice. */
export function downloadExcel(
    filename: string,
    sheets: ExcelSheet | ExcelSheet[],
): void {
    const list = Array.isArray(sheets) ? sheets : [sheets];
    const safeName = filename.toLowerCase().endsWith('.xls')
        ? filename
        : `${filename.replace(/\.xlsx$/i, '')}.xls`;
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${list.map((sheet) => sheetXml(sheet)).join('\n')}
</Workbook>`;

    downloadTextFile(
        safeName,
        xml,
        'application/vnd.ms-excel;charset=utf-8',
    );
}

export function excelFilename(label: string): string {
    const slug = label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${slug || 'export'}.xls`;
}

function cellText(node: Element): string {
    const clone = node.cloneNode(true) as HTMLElement;

    clone
        .querySelectorAll('button, svg, [data-slot="dropdown-menu"], .sr-only')
        .forEach((el) => el.remove());

    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function isSkippableColumn(header: string, cells: string[]): boolean {
    const label = header.toLowerCase();

    if (label === '' || label === 'actions' || label.includes('action')) {
        return true;
    }

    return cells.every((cell) => cell === '');
}

/** Build an Excel sheet from a rendered HTML table (skips action columns). */
export function excelSheetFromTable(
    table: HTMLTableElement,
    sheetName = 'Données',
): ExcelSheet | null {
    const headers = Array.from(
        table.querySelectorAll('thead th'),
    ).map((th) => cellText(th));

    if (headers.length === 0) {
        return null;
    }

    const bodyRows = Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => cellText(td)),
    );

    const keep = headers.map((header, index) => {
        const column = bodyRows.map((row) => row[index] ?? '');

        return !isSkippableColumn(header, column);
    });

    return {
        name: sheetName,
        headers: headers.filter((_, index) => keep[index]),
        rows: bodyRows.map((row) =>
            row.filter((_, index) => keep[index]),
        ),
    };
}

export function downloadTableAsExcel(
    table: HTMLTableElement,
    filename: string,
    sheetName = 'Données',
): boolean {
    const sheet = excelSheetFromTable(table, sheetName);

    if (!sheet || sheet.headers.length === 0) {
        return false;
    }

    downloadExcel(filename, sheet);

    return true;
}

export function printHtmlDocument(title: string, bodyHtml: string): void {
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${title.replace(/</g, '&lt;')}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; }
  .meta { color: #555; font-size: 13px; margin: 0 0 4px; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');

    if (!popup) {
        URL.revokeObjectURL(url);

        return;
    }

    const triggerPrint = (): void => {
        popup.focus();
        popup.print();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };

    popup.addEventListener('load', triggerPrint);
    window.setTimeout(() => {
        try {
            if (popup.document?.readyState === 'complete') {
                triggerPrint();
            }
        } catch {
            // ignore
        }
    }, 250);
}
