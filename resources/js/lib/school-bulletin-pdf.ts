import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNote } from '@/lib/school-grades';
import { COUNTRY_MOTTO, COUNTRY_NAME, formatFrDate } from '@/lib/school-rows';
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

function note(value: number | null): string {
    return value === null ? '—' : formatNote(value);
}

function rankLabel(rank: number | null, classSize: number): string {
    if (rank === null) {
        return '—';
    }

    const ordinal = rank === 1 ? '1er' : `${rank}e`;

    return `${ordinal} / ${classSize}`;
}

function escapePdfText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

/** Build and download a formatted A4 bulletin PDF. */
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
    doc.text(escapePdfText(fiche.profile.name), margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
        escapePdfText(`${fiche.profile.address} — ${fiche.profile.city}`),
        margin,
        y,
    );
    y += 4;
    doc.text(
        escapePdfText(`Tél. ${fiche.profile.phone} · ${fiche.profile.email}`),
        margin,
        y,
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(COUNTRY_NAME.toUpperCase(), pageWidth - margin, 14, {
        align: 'right',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(COUNTRY_MOTTO, pageWidth - margin, 19, { align: 'right' });
    doc.text(`Année scolaire ${fiche.yearLabel}`, pageWidth - margin, 24, {
        align: 'right',
    });

    y = 34;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('BULLETIN DE NOTES', pageWidth / 2, y, { align: 'center' });
    y += 10;

    const identity: Array<[string, string]> = [
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
        identity.splice(2, 0, ['Série', fiche.trackCode]);
    }

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
            fillColor: [245, 245, 245],
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
            note(line.devoir),
            note(line.composition),
            note(line.average),
            String(line.coefficient),
            note(line.weighted),
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
    doc.text(fiche.mention ?? '—', leftX + doc.getTextWidth('Mention : '), y);

    doc.setFont('helvetica', 'normal');
    doc.text('Total général : ', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(
        fiche.lines.some((line) => line.weighted !== null)
            ? formatNote(fiche.totalGeneral)
            : '—',
        rightX + doc.getTextWidth('Total général : '),
        y,
    );
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Résultat : ', leftX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(fiche.result ?? '—', leftX + doc.getTextWidth('Résultat : '), y);

    doc.setFont('helvetica', 'normal');
    doc.text('Moyenne : ', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(
        fiche.average === null ? '—' : formatNote(fiche.average),
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
    doc.text(`Fait à ${fiche.profile.city} le ${fiche.issuedOn}`, rightX, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Appréciation : ', leftX, y);
    doc.setFont('helvetica', 'bold');
    const appreciation = doc.splitTextToSize(
        fiche.appreciation || '—',
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

/** HTML body for the print dialog — same content as the PDF. */
export function bulletinPrintHtml(fiche: BulletinApiFiche): string {
    const rows = fiche.lines
        .map(
            (line) => `<tr>
  <td style="text-transform:uppercase">${escapeHtml(line.name)}</td>
  <td class="c">${escapeHtml(note(line.devoir))}</td>
  <td class="c">${escapeHtml(note(line.composition))}</td>
  <td class="c">${escapeHtml(note(line.average))}</td>
  <td class="c">${line.coefficient}</td>
  <td class="c">${escapeHtml(note(line.weighted))}</td>
</tr>`,
        )
        .join('');

    const identity = [
        ['Numéro d’élève', fiche.student.matricule],
        ['Classe', fiche.classroomName],
        ...(fiche.trackCode ? [['Série', fiche.trackCode] as const] : []),
        [
            'Nom(s) et prénom(s)',
            `${fiche.student.lastName} ${fiche.student.firstName}`,
        ],
        ['Date de naissance', formatFrDate(fiche.student.bornOn)],
        ['Genre', genderLabel(fiche.student.gender)],
        ['Examen', fiche.term.name],
    ]
        .map(
            ([label, value]) =>
                `<p>${escapeHtml(label)} : <strong>${escapeHtml(value)}</strong></p>`,
        )
        .join('');

    return `
<header class="top">
  <div>
    <p class="school">${escapeHtml(fiche.profile.name)}</p>
    <p>${escapeHtml(fiche.profile.address)} — ${escapeHtml(fiche.profile.city)}</p>
    <p>Tél. ${escapeHtml(fiche.profile.phone)} · ${escapeHtml(fiche.profile.email)}</p>
  </div>
  <div class="country">
    <p class="strong">${escapeHtml(COUNTRY_NAME.toUpperCase())}</p>
    <p>${escapeHtml(COUNTRY_MOTTO)}</p>
    <p>Année scolaire ${escapeHtml(fiche.yearLabel)}</p>
  </div>
</header>
<h1>Bulletin de notes</h1>
<section class="identity">${identity}</section>
<table>
  <thead>
    <tr>
      <th>Matière</th>
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
    <p>Mention : <strong>${escapeHtml(fiche.mention ?? '—')}</strong></p>
    <p>Résultat : <strong>${escapeHtml(fiche.result ?? '—')}</strong></p>
    <p>Rang : <strong>${escapeHtml(rankLabel(fiche.rank, fiche.classSize))}</strong></p>
    <p>Appréciation : <strong>${escapeHtml(fiche.appreciation || '—')}</strong></p>
  </div>
  <div>
    <p>Total général : <strong>${escapeHtml(
        fiche.lines.some((line) => line.weighted !== null)
            ? formatNote(fiche.totalGeneral)
            : '—',
    )}</strong></p>
    <p>Moyenne : <strong>${escapeHtml(
        fiche.average === null ? '—' : formatNote(fiche.average),
    )}</strong></p>
    <p>Fait à ${escapeHtml(fiche.profile.city)} le ${escapeHtml(fiche.issuedOn)}</p>
    <p class="director">Le Directeur<br /><strong>${escapeHtml(fiche.profile.directorName)}</strong></p>
  </div>
</section>`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
  @page { size: A4; margin: 14mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 0; padding: 8mm; }
  .top { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .school { font-weight: 700; font-size: 14px; margin: 0 0 4px; }
  .country { text-align: center; font-size: 12px; }
  .strong { font-weight: 700; font-size: 14px; text-transform: uppercase; margin: 0; }
  h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin: 24px 0 16px; }
  .identity { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin-bottom: 16px; }
  .identity p { margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #333; padding: 6px 8px; }
  th { background: #f3f3f3; }
  td.c { text-align: center; }
  .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; font-size: 13px; }
  .director { margin-top: 28px; }
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
            // Cross-origin edge case — ignore; load handler may still run.
        }
    }, 250);
}
