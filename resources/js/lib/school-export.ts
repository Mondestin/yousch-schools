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

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function openPrintPopup(html: string): void {
    const iframe = document.createElement('iframe');

    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'Impression');
    // Must be on-screen sized: 0×0 / opacity:0 iframes often print blank in Chrome.
    iframe.style.cssText =
        'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:-1;visibility:hidden;';

    let printed = false;

    const cleanup = (): void => {
        iframe.remove();
    };

    const triggerPrint = (): void => {
        if (printed) {
            return;
        }

        printed = true;

        const frameWindow = iframe.contentWindow;
        const frameDocument = iframe.contentDocument;

        if (!frameWindow || !frameDocument) {
            cleanup();

            return;
        }

        const images = Array.from(frameDocument.images);
        const stylesheets = Array.from(
            frameDocument.querySelectorAll('link[rel="stylesheet"]'),
        );

        const waitForAssets = Promise.all([
            ...images.map(
                (image) =>
                    new Promise<void>((resolve) => {
                        if (image.complete) {
                            resolve();

                            return;
                        }

                        image.addEventListener('load', () => resolve(), {
                            once: true,
                        });
                        image.addEventListener('error', () => resolve(), {
                            once: true,
                        });
                    }),
            ),
            ...stylesheets.map(
                (link) =>
                    new Promise<void>((resolve) => {
                        const node = link as HTMLLinkElement;

                        if (node.sheet) {
                            resolve();

                            return;
                        }

                        node.addEventListener('load', () => resolve(), {
                            once: true,
                        });
                        node.addEventListener('error', () => resolve(), {
                            once: true,
                        });
                    }),
            ),
        ]);

        void waitForAssets.then(() => {
            window.setTimeout(() => {
                frameWindow.focus();
                frameWindow.print();
                frameWindow.addEventListener('afterprint', cleanup, {
                    once: true,
                });
                window.setTimeout(cleanup, 60_000);
            }, 100);
        });
    };

    iframe.addEventListener('load', triggerPrint);
    document.body.appendChild(iframe);
    // srcdoc keeps the frame same-origin so app stylesheets can load.
    iframe.srcdoc = html;
}

function collectedPageStyles(): string {
    return Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style'),
    )
        .map((node) => {
            if (node instanceof HTMLLinkElement) {
                const absolute = new URL(node.href, window.location.href).href;

                return `<link rel="stylesheet" href="${escapeHtml(absolute)}" />`;
            }

            return node.outerHTML;
        })
        .join('\n');
}

/** Print an isolated HTML document in a popup (never the app chrome). */
export function printHtmlDocument(title: string, bodyHtml: string): void {
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #111;
    background: #fff;
  }
  h1 { font-size: 18px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td {
    border: 1px solid #d4d4d8;
    padding: 6px 8px;
    text-align: left;
    font-size: 12px;
  }
  th { background: #f4f4f5; font-weight: 600; }
  .meta { color: #52525b; font-size: 12px; margin: 0 0 4px; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

    openPrintPopup(html);
}

/** Print a visible DOM node (document sheet, grid) without the surrounding page. */
export function printDomElement(
    title: string,
    element: HTMLElement,
    options?: { landscape?: boolean; pageSize?: string },
): void {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach((node) => node.remove());
    clone.querySelectorAll('img[src]').forEach((node) => {
        const image = node as HTMLImageElement;
        const src = image.getAttribute('src');

        if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
            image.setAttribute(
                'src',
                new URL(src, window.location.href).href,
            );
        }
    });

    const page =
        options?.pageSize ??
        (options?.landscape ? 'A4 landscape' : 'A4');
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
${collectedPageStyles()}
<style>
  @page { size: ${page}; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
  }
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .no-print { display: none !important; }
  [data-print-only] { display: block !important; }
  .print-bulletin {
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
  [data-print-root="id-card"] {
    box-shadow: none !important;
    break-inside: avoid;
  }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

    openPrintPopup(html);
}

/** Print a data table (results, exports) as a clean sheet. */
export function printTableElement(
    title: string,
    table: HTMLTableElement,
    meta: string[] = [],
): void {
    const clone = table.cloneNode(true) as HTMLTableElement;
    clone.removeAttribute('class');
    clone.querySelectorAll('[class]').forEach((node) => {
        node.removeAttribute('class');
    });

    const metaHtml = meta
        .map((line) => `<p class="meta">${escapeHtml(line)}</p>`)
        .join('');

    printHtmlDocument(
        title,
        `<h1>${escapeHtml(title)}</h1>${metaHtml}${clone.outerHTML}`,
    );
}

/** Resolve the nearest printable root from a click target or the page. */
export function findPrintRoot(
    from?: ParentNode | null,
): HTMLElement | null {
    const scope = from ?? document;
    const marked = scope.querySelector<HTMLElement>('[data-print-root]');

    if (marked) {
        return marked;
    }

    return (
        scope.querySelector<HTMLElement>('article.print-bulletin') ??
        scope.querySelector<HTMLElement>('table[data-slot="table"]')
    );
}
