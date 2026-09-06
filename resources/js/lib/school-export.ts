/** Client-side download / print helpers for table export actions. */

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
