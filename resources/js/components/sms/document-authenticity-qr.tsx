import { encode } from 'uqr';
import { useEffect, useMemo, useState } from 'react';
import { apiJson } from '@/lib/api';
import { cn } from '@/lib/utils';
import { authenticity as mintAuthenticity } from '@/routes/documents';

export type DocumentAuthenticityClaims = {
    type:
        | 'bulletin'
        | 'attestation'
        | 'certificat'
        | 'payment_statement'
        | 'payment_receipt';
    studentId: string;
    refId?: string | null;
    termId?: string | null;
    academicYearId?: string | null;
    issuedOn?: string | null;
};

function claimsKey(claims: DocumentAuthenticityClaims): string {
    return [
        claims.type,
        claims.studentId,
        claims.refId ?? '',
        claims.termId ?? '',
        claims.academicYearId ?? '',
        claims.issuedOn ?? '',
    ].join('|');
}

export function useDocumentVerifyUrl(
    claims: DocumentAuthenticityClaims,
): string | null {
    const [url, setUrl] = useState<string | null>(null);
    const key = claimsKey(claims);

    useEffect(() => {
        let cancelled = false;

        void apiJson<{ url: string }>(mintAuthenticity.url(), {
            method: 'POST',
            body: {
                type: claims.type,
                studentId: claims.studentId,
                refId: claims.refId ?? null,
                termId: claims.termId ?? null,
                academicYearId: claims.academicYearId ?? null,
                issuedOn: claims.issuedOn ?? null,
            },
        })
            .then((data) => {
                if (!cancelled) {
                    setUrl(data.url);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setUrl(null);
                }
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by claimsKey
    }, [key]);

    return url;
}

function QrSvg({ value, size = 88 }: { value: string; size?: number }) {
    const modules = useMemo(() => encode(value), [value]);
    const dim = modules.size;
    const cell = size / dim;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            shapeRendering="crispEdges"
            aria-hidden="true"
        >
            <rect width={size} height={size} fill="#fff" />
            {modules.data.map((row, y) =>
                row.map((on, x) =>
                    on ? (
                        <rect
                            key={`${x}-${y}`}
                            x={x * cell}
                            y={y * cell}
                            width={cell}
                            height={cell}
                            fill="#000"
                        />
                    ) : null,
                ),
            )}
        </svg>
    );
}

/** Bottom-left authenticity QR for printable school documents. */
export function DocumentAuthenticityQr({
    claims,
    className,
    verifyUrl,
}: {
    claims: DocumentAuthenticityClaims;
    className?: string;
    /** Optional precomputed URL (e.g. print popup). */
    verifyUrl?: string | null;
}) {
    const minted = useDocumentVerifyUrl(claims);
    const url = verifyUrl ?? minted;

    if (!url) {
        return (
            <div
                className={cn(
                    'document-authenticity flex w-[11rem] flex-col gap-1',
                    className,
                )}
            >
                <div className="bg-muted/40 h-[80px] w-[80px]" />
                <p className="whitespace-nowrap text-[8px] leading-tight text-black/70">
                    Scannez pour vérifier l’authenticité
                </p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'document-authenticity flex w-[11rem] flex-col gap-1',
                className,
            )}
        >
            <QrSvg value={url} size={80} />
            <p className="whitespace-nowrap text-[8px] leading-tight text-black/70">
                Scannez pour vérifier l’authenticité
            </p>
        </div>
    );
}

export function documentAuthenticityQrHtml(verifyUrl: string): string {
    const modules = encode(verifyUrl);
    const size = 80;
    const dim = modules.size;
    const cell = size / dim;
    let rects = '';

    for (let y = 0; y < dim; y++) {
        for (let x = 0; x < dim; x++) {
            if (modules.data[y]?.[x]) {
                rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
            }
        }
    }

    return `<div class="authenticity">
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${rects}
  </svg>
  <p>Scannez pour vérifier l’authenticité</p>
</div>`;
}
