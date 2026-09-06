import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNote } from '@/lib/school-grades';
import {
    COUNTRY_MOTTO,
    COUNTRY_NAME,
    COUNTRY_SHORT,
    formatFrDate,
} from '@/lib/school-rows';
import { genderLabel } from '@/lib/school-students';
import type { Gender, SchoolProfile } from '@/types/school';

export type BulletinLine = {
    subjectId: string;
    code: string;
    name: string;
    coefficient: number;
    devoir: number | null;
    composition: number | null;
    average: number | null;
    weighted: number | null;
};

export type BulletinApiFiche = {
    student: {
        matricule: string;
        firstName: string;
        lastName: string;
        bornOn: string;
        gender: Gender;
    };
    name: string;
    classroomName: string;
    yearLabel: string;
    trackCode: string | null;
    term: { name: string };
    lines: BulletinLine[];
    average: number | null;
    totalGeneral: number;
    mention: string | null;
    result: string | null;
    rank: number | null;
    classSize: number;
    appreciation: string;
    profile: SchoolProfile;
    issuedOn: string;
};

/** Match maquette: blank cell when the note is missing. */
function noteCell(value: number | null): string {
    return value === null ? '' : formatNote(value);
}

function rankLabel(rank: number | null, classSize: number): string {
    if (rank === null) {
        return '';
    }

    const ordinal = rank === 1 ? '1er' : `${rank}e`;

    return `${ordinal} / ${classSize}`;
}

function escapePdfText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function absoluteUrl(url: string | null | undefined): string | null {
    if (!url) {
        return null;
    }

    if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:')
    ) {
        return url;
    }

    if (typeof window === 'undefined') {
        return url;
    }

    return new URL(url, window.location.origin).href;
}

function identityRows(fiche: BulletinApiFiche): Array<[string, string]> {
    const rows: Array<[string, string]> = [
        ['Numéro d’élève', fiche.student.matricule],
        ['Classe', fiche.classroomName],
        [
            'Nom(s) et prénom(s)',
            `${fiche.student.lastName} ${fiche.student.firstName}`,
        ],
        ['Date de naissance', formatFrDate(fiche.student.bornOn)],
        ['Genre', genderLabel(fiche.student.gender)],
        ['Examen', fiche.term.name],
    ];

    if (fiche.trackCode) {
        rows.splice(2, 0, ['Série', fiche.trackCode]);
    }

    return rows;
}

function totalGeneralLabel(fiche: BulletinApiFiche): string {
    return fiche.lines.some((line) => line.weighted !== null)
        ? formatNote(fiche.totalGeneral)
        : '';
}

function averageLabel(fiche: BulletinApiFiche): string {
    return fiche.average === null ? '' : formatNote(fiche.average);
}

/** Build and download a formatted A4 bulletin PDF (aligned with the maquette). */
export function downloadBulletinPdf(
    fiche: BulletinApiFiche,
    filename: string,
): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(escapePdfText(fiche.profile.name), pageWidth / 4, y, {
        align: 'center',
    });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (fiche.profile.motto) {
        doc.text(escapePdfText(fiche.profile.motto), pageWidth / 4, y, {
            align: 'center',
        });
        y += 4;
    }

    if (fiche.profile.phone) {
        doc.text(`Tél. : ${escapePdfText(fiche.profile.phone)}`, pageWidth / 4, y, {
            align: 'center',
        });
        y += 4;
    }

    if (fiche.profile.email) {
        doc.text(
            `E-mail : ${escapePdfText(fiche.profile.email)}`,
            pageWidth / 4,
            y,
            { align: 'center' },
        );
        y += 4;
    }

    if (fiche.profile.address) {
        doc.text(escapePdfText(fiche.profile.address), pageWidth / 4, y, {
            align: 'center',
        });
        y += 4;
    }

    doc.text(
        `${escapePdfText(fiche.profile.city)}, ${COUNTRY_SHORT}`,
        pageWidth / 4,
        y,
        { align: 'center' },
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(COUNTRY_NAME.toUpperCase(), (pageWidth * 3) / 4, 14, {
        align: 'center',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(COUNTRY_MOTTO, (pageWidth * 3) / 4, 19, { align: 'center' });
    doc.text('-------', (pageWidth * 3) / 4, 24, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Année scolaire ${fiche.yearLabel}`, (pageWidth * 3) / 4, 32, {
        align: 'center',
    });

    y = 42;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('BULLETIN DE NOTES', pageWidth / 2, y, { align: 'center' });
    y += 10;

    const identity = identityRows(fiche);

    doc.setFontSize(10);
    const colGap = (pageWidth - margin * 2) / 2;

    identity.forEach(([label, value], index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = margin + col * colGap;
        const lineY = y + row * 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`${label} : `, x, lineY);
        const labelWidth = doc.getTextWidth(`${label} : `);
        doc.setFont('helvetica', 'bold');
        doc.text(escapePdfText(value), x + labelWidth, lineY);
    });

    y += Math.ceil(identity.length / 2) * 6 + 6;

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 2.2,
            lineColor: [40, 40, 40],
            lineWidth: 0.2,
            textColor: [20, 20, 20],
        },
        headStyles: {
            fillColor: [244, 244, 245],
            textColor: [20, 20, 20],
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: 55 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' },
        },
        head: [
            [
                'Matière',
                'Moyenne de classe',
                'Composition',
                'Moyenne',
                'Coefficient',
                'Moyenne finale',
            ],
        ],
        body: fiche.lines.map((line) => [
            line.name.toUpperCase(),
            noteCell(line.devoir),
            noteCell(line.composition),
            noteCell(line.average),
            String(line.coefficient),
            noteCell(line.weighted),
        ]),
    });

    const tableEnd =
        (
            doc as jsPDF & {
                lastAutoTable?: { finalY: number };
            }
        ).lastAutoTable?.finalY ?? y + 40;

    y = tableEnd + 10;
    const leftX = margin;
    const rightX = pageWidth / 2 + 4;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Mention : ', leftX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(fiche.mention ?? '', leftX + doc.getTextWidth('Mention : '), y);

    doc.setFont('helvetica', 'normal');
    doc.text('Total général : ', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(
        totalGeneralLabel(fiche),
        rightX + doc.getTextWidth('Total général : '),
        y,
    );
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Résultat : ', leftX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(fiche.result ?? '', leftX + doc.getTextWidth('Résultat : '), y);

    doc.setFont('helvetica', 'normal');
    doc.text('Moyenne : ', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(
        averageLabel(fiche),
        rightX + doc.getTextWidth('Moyenne : '),
        y,
    );
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Rang : ', leftX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(
        rankLabel(fiche.rank, fiche.classSize),
        leftX + doc.getTextWidth('Rang : '),
        y,
    );

    doc.setFont('helvetica', 'normal');
    doc.text(
        `Fait à ${fiche.profile.city} le, ${fiche.issuedOn}`,
        rightX,
        y,
    );
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Appréciation : ', leftX, y);
    doc.setFont('helvetica', 'bold');
    const appreciation = doc.splitTextToSize(
        fiche.appreciation || '',
        pageWidth / 2 - margin - 4,
    );
    doc.text(appreciation, leftX + doc.getTextWidth('Appréciation : '), y);

    y = Math.max(y + appreciation.length * 5, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.text('Le Directeur', rightX, y);
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(escapePdfText(fiche.profile.directorName), rightX, y);

    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/** HTML body for the print dialog - same layout as the maquette (reports/show). */
export function bulletinPrintHtml(fiche: BulletinApiFiche): string {
    const logoUrl = absoluteUrl(fiche.profile.logoUrl);
    const stampUrl = absoluteUrl(fiche.profile.stampUrl);

    const rows = fiche.lines
        .map(
            (line) => `<tr>
  <td class="subject">${escapeHtml(line.name)}</td>
  <td class="c">${escapeHtml(noteCell(line.devoir))}</td>
  <td class="c">${escapeHtml(noteCell(line.composition))}</td>
  <td class="c">${escapeHtml(noteCell(line.average))}</td>
  <td class="c">${line.coefficient}</td>
  <td class="c">${escapeHtml(noteCell(line.weighted))}</td>
</tr>`,
        )
        .join('');

    const identity = identityRows(fiche)
        .map(
            ([label, value]) =>
                `<p>${escapeHtml(label)}<span class="sep">:</span><strong>${escapeHtml(value)}</strong></p>`,
        )
        .join('');

    const letterhead = `
  <div class="letterhead">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" class="logo" />` : ''}
    <p class="school">${escapeHtml(fiche.profile.name)}</p>
    ${fiche.profile.motto ? `<p class="motto">${escapeHtml(fiche.profile.motto)}</p>` : ''}
    ${fiche.profile.phone ? `<p>Tél. : ${escapeHtml(fiche.profile.phone)}</p>` : ''}
    ${fiche.profile.email ? `<p>E-mail : ${escapeHtml(fiche.profile.email)}</p>` : ''}
    ${fiche.profile.address ? `<p>${escapeHtml(fiche.profile.address)}</p>` : ''}
    <p>${escapeHtml(fiche.profile.city)}, ${escapeHtml(COUNTRY_SHORT)}</p>
  </div>`;

    return `
<header class="top">
  ${letterhead}
  <div class="country">
    <p class="strong">${escapeHtml(COUNTRY_NAME)}</p>
    <p>${escapeHtml(COUNTRY_MOTTO)}</p>
    <p class="rule">-------</p>
    <p class="year">Année scolaire ${escapeHtml(fiche.yearLabel)}</p>
  </div>
</header>
<h1>Bulletin de notes</h1>
<section class="identity">${identity}</section>
<table>
  <thead>
    <tr>
      <th class="left">Matière</th>
      <th>Moyenne de classe</th>
      <th>Composition</th>
      <th>Moyenne</th>
      <th>Coefficient</th>
      <th>Moyenne finale</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<section class="summary">
  <div>
    <p>Mention : <strong>${escapeHtml(fiche.mention ?? '')}</strong></p>
    <p>Résultat : <strong>${escapeHtml(fiche.result ?? '')}</strong></p>
    <p>Rang : <strong>${escapeHtml(rankLabel(fiche.rank, fiche.classSize))}</strong></p>
    <p>Appréciation : <strong>${escapeHtml(fiche.appreciation || '')}</strong></p>
  </div>
  <div>
    <p>Total général : <strong>${escapeHtml(totalGeneralLabel(fiche))}</strong></p>
    <p>Moyenne : <strong>${escapeHtml(averageLabel(fiche))}</strong></p>
    <p>Fait à ${escapeHtml(fiche.profile.city)} le, ${escapeHtml(fiche.issuedOn)}</p>
    ${stampUrl ? `<img src="${escapeHtml(stampUrl)}" alt="Cachet et signature" class="stamp" />` : ''}
    <p class="director">Le Directeur<br /><strong>${escapeHtml(fiche.profile.directorName)}</strong></p>
  </div>
</section>`;
}

export function printBulletinDocument(
    title: string,
    fiche: BulletinApiFiche,
): void {
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #000;
    margin: 0;
    padding: 8mm;
    background: #fff;
  }
  .top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    align-items: start;
  }
  .letterhead {
    text-align: center;
    font-size: 12px;
    line-height: 1.45;
  }
  .letterhead p { margin: 0; }
  .logo {
    display: block;
    margin: 0 auto 8px;
    height: 96px;
    width: 128px;
    object-fit: contain;
  }
  .school {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .motto { font-size: 13px; font-weight: 500; }
  .country {
    text-align: center;
    font-size: 12px;
    line-height: 1.45;
  }
  .country p { margin: 0; }
  .strong {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .rule { margin: 4px 0 !important; }
  .year {
    margin-top: 40px !important;
    font-size: 13px;
    font-weight: 500;
  }
  h1 {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 32px 0 24px;
  }
  .identity {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 32px;
    row-gap: 4px;
    font-size: 14px;
    margin-bottom: 24px;
  }
  .identity p { margin: 0; }
  .sep { margin: 0 8px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #000;
    padding: 6px 8px;
  }
  th {
    background: #f4f4f5;
    font-weight: 600;
  }
  th.left { text-align: left; }
  td.subject { text-transform: uppercase; }
  td.c { text-align: center; }
  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: 32px;
    font-size: 14px;
  }
  .summary p { margin: 0 0 12px; }
  .stamp {
    display: block;
    margin-top: 16px;
    height: 96px;
    width: 160px;
    object-fit: contain;
  }
  .director { margin-top: 24px !important; padding-top: 8px; }
</style>
</head>
<body>
${bulletinPrintHtml(fiche)}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');

    if (!popup) {
        URL.revokeObjectURL(url);

        return;
    }

    let printed = false;

    const triggerPrint = (): void => {
        if (printed) {
            return;
        }

        printed = true;
        popup.focus();
        popup.print();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };

    popup.addEventListener('load', triggerPrint);

    // Some browsers fire load before the listener is attached for blob URLs.
    window.setTimeout(() => {
        try {
            if (popup.document?.readyState === 'complete') {
                triggerPrint();
            }
        } catch {
            // Cross-origin edge case - ignore; load handler may still run.
        }
    }, 250);
}
