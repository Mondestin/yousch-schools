import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type CakeSlice = {
    key: string;
    label: string;
    count: number;
    /** CSS color, e.g. var(--primary) or #6425d0 */
    fill: string;
};

type Point = { x: number; y: number };

function polar(
    cx: number,
    cy: number,
    radius: number,
    angleDeg: number,
): Point {
    const rad = ((angleDeg - 90) * Math.PI) / 180;

    return {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad),
    };
}

function slicePath(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
): string {
    const start = polar(cx, cy, radius, endAngle);
    const end = polar(cx, cy, radius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
        'Z',
    ].join(' ');
}

/**
 * Flat 2D cake pie with percentages drawn inside each slice.
 */
export function CakeChart({
    slices,
    className,
    height = 220,
}: {
    slices: CakeSlice[];
    className?: string;
    height?: number;
}) {
    const total = slices.reduce((sum, slice) => sum + slice.count, 0);

    const geometry = useMemo(() => {
        if (total === 0 || slices.length === 0) {
            return [];
        }

        const cx = 160;
        const cy = 110;
        const radius = 78;
        const percentRadius = radius * 0.55;
        let angle = 0;

        return slices.map((slice) => {
            const share = slice.count / total;
            const sweep = Math.max(share * 360, 0.5);
            const startAngle = angle;
            const endAngle = angle + sweep;
            const mid = startAngle + sweep / 2;
            const percentPoint = polar(cx, cy, percentRadius, mid);
            const percent = Math.round(share * 100);

            angle = endAngle;

            return {
                key: slice.key,
                name: slice.label,
                count: slice.count,
                fill: slice.fill,
                path: slicePath(cx, cy, radius, startAngle, endAngle),
                percentPoint,
                percent,
                sweep,
            };
        });
    }, [slices, total]);

    if (total === 0) {
        return (
            <div
                className={cn(
                    'text-muted-foreground flex items-center justify-center text-[13px]',
                    className,
                )}
                style={{ height }}
            >
                Aucune donnée
            </div>
        );
    }

    return (
        <svg
            viewBox="0 0 320 220"
            role="img"
            className={cn('mx-auto block w-full max-w-[340px]', className)}
            style={{ height }}
            aria-label={slices
                .map((slice) => `${slice.label} : ${slice.count}`)
                .join('. ')}
        >
            {geometry.map((slice) => (
                <g key={slice.key}>
                    <path
                        d={slice.path}
                        fill={slice.fill}
                        stroke="var(--card)"
                        strokeWidth={2}
                    />
                    {slice.sweep >= 18 ? (
                        <text
                            x={slice.percentPoint.x}
                            y={slice.percentPoint.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#ffffff"
                            className="text-[13px] font-semibold"
                        >
                            {`${slice.percent}%`}
                        </text>
                    ) : null}
                </g>
            ))}
        </svg>
    );
}
