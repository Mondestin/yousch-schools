import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatFrDate } from '@/lib/school-rows';
import { planLabel, subscriptionMethodLabel } from '@/lib/school-subscription';
import type { SchoolProfile, SubscriptionReceipt } from '@/types/school';

type SubscriptionInvoice = {
    profile: SchoolProfile;
    receipt: SubscriptionReceipt;
    issuedOn?: string | null;
    dueOn?: string | null;
};

function cleanText(value: string): string {
    return value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatAmount(amount: number): string {
    return (
        new Intl.NumberFormat('fr-FR')
            .format(amount)
            .replace(/[\u00a0\u202f]/g, ' ') + ' FCFA'
    );
}

/** Letter geometry, type scale and column alignment follow the supplied invoice template. */
export function buildSubscriptionInvoicePdf({
    profile,
    receipt,
    issuedOn,
    dueOn,
}: SubscriptionInvoice): jsPDF {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const left = 34.35;
    const right = 577.65;
    const isPaid = receipt.status === 'paye';
    const amount = formatAmount(receipt.amount);
    const balance = isPaid
        ? '0 FCFA'
        : receipt.status === 'partiel'
          ? 'À confirmer'
          : amount;
    const date = (value?: string | null): string =>
        value ? formatFrDate(value) : 'Non renseignée';

    doc.setProperties({
        title: (isPaid ? 'Reçu ' : 'Facture ') + receipt.reference,
        author: 'Yousch',
    });
    doc.setTextColor(34, 34, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('yousch', left, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.text(isPaid ? 'REÇU' : 'FACTURE', right, 72, { align: 'right' });

    doc.setFontSize(10);
    doc.text('Yousch', left, 110);
    doc.text('Abonnements de gestion scolaire', left, 123);

    function block(
        lines: string[],
        x: number,
        y: number,
        width: number,
    ): number {
        for (const line of lines.filter(Boolean)) {
            const wrapped: string[] = doc.splitTextToSize(
                cleanText(line),
                width,
            );
            doc.text(wrapped, x, y, { lineHeightFactor: 1.3 });
            y += wrapped.length * 13;
        }
        return y;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à :', left, 190);
    doc.setFont('helvetica', 'normal');
    const customerEnd = block(
        [
            profile.name,
            profile.address,
            profile.city,
            profile.country,
            profile.email,
        ],
        left,
        203,
        242,
    );

    const metadata: Array<[string, string]> = [
        [isPaid ? 'Numéro du reçu' : 'Numéro de facture', receipt.reference],
        [
            isPaid ? 'Date du paiement' : 'Date de facture',
            date(isPaid ? receipt.paidOn : issuedOn),
        ],
        ['Échéance', date(dueOn)],
        ['Montant dû', balance],
    ];
    let metaY = 193;
    for (const [index, [label, value]] of metadata.entries()) {
        doc.setFont('helvetica', index === 3 ? 'bold' : 'normal');
        doc.text(label, 310.5, metaY);
        const lines: string[] = doc.splitTextToSize(cleanText(value), 134);
        doc.text(lines, 443.93, metaY, { lineHeightFactor: 1.3 });
        metaY += Math.max(19, lines.length * 13 + 4);
    }

    const tableTop = Math.max(277, customerEnd + 16, metaY + 16);
    autoTable(doc, {
        startY: tableTop,
        margin: { left, right: 34.35, bottom: 46, top: 40 },
        tableWidth: right - left,
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 10,
            textColor: [34, 34, 34],
            cellPadding: { top: 12, right: 4.5, bottom: 12, left: 4.5 },
            overflow: 'linebreak',
        },
        headStyles: {
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: { top: 0, bottom: 8, left: 4.5, right: 4.5 },
            lineWidth: { bottom: 0.75 },
            lineColor: [128, 128, 128],
        },
        columnStyles: {
            0: { cellWidth: 282 },
            1: { cellWidth: 55 },
            2: { cellWidth: 100, halign: 'right' },
            3: { halign: 'right' },
        },
        head: [['Description', 'Quantité', 'Tarif', 'Montant']],
        body: [
            [
                'Abonnement ' +
                    planLabel(receipt.plan) +
                    '\n' +
                    cleanText(receipt.periodLabel),
                '1',
                amount,
                amount,
            ],
        ],
    });

    const tableEnd = (doc as jsPDF & { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY;
    let totalY = Math.max(419, tableEnd + 48);
    if (totalY + 135 > 745) {
        doc.addPage();
        totalY = 70;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sous-total', 472, totalY, { align: 'right' });
    doc.text(amount, right, totalY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(isPaid ? 'Montant réglé' : 'Montant dû', 472, totalY + 19, {
        align: 'right',
    });
    doc.text(isPaid ? amount : balance, right, totalY + 19, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Mémo :', left, totalY + 54);
    const memo = isPaid
        ? 'Paiement reçu par ' +
          subscriptionMethodLabel(receipt.method) +
          '. Merci pour votre confiance.'
        : receipt.status === 'partiel'
          ? 'Paiement partiel. Le solde restant doit être confirmé à partir des règlements enregistrés.'
          : 'Référence à rappeler lors du paiement : ' +
            receipt.reference +
            '.';
    block([memo], left, totalY + 67, right - left);

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(page + ' sur ' + pages, right, 775, { align: 'right' });
    }
    return doc;
}

export function downloadSubscriptionInvoicePdf(
    invoice: SubscriptionInvoice,
): void {
    const prefix = invoice.receipt.status === 'paye' ? 'recu-' : 'facture-';
    buildSubscriptionInvoicePdf(invoice).save(
        prefix + invoice.receipt.reference + '.pdf',
    );
}
