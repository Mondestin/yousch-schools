import { encode } from 'uqr';
import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

/** ISO/IEC 7810 ID-1 (CR80) PVC card size. */
export const ID_CARD_WIDTH_MM = 85.6;
export const ID_CARD_HEIGHT_MM = 53.98;

export type IdCardOrientation = 'horizontal' | 'vertical';
export type IdCardLayout = 'classic' | 'split' | 'compact';
export type IdCardKind = 'student' | 'staff';
export type IdCardField =
    | 'matricule'
    | 'bornOn'
    | 'phone'
    | 'classroom'
    | 'role';

export type IdCardPerson = {
    id: string;
    name: string;
    subtitle: string;
    photoUrl: string | null;
    fields: Partial<Record<IdCardField, string>>;
};

export const ID_CARD_FIELD_LABELS: Record<IdCardField, string> = {
    matricule: 'Matricule',
    bornOn: 'Naissance',
    phone: 'Téléphone',
    classroom: 'Classe',
    role: 'Fonction',
};

const FIELD_PRINT_LABELS: Record<IdCardField, string> = {
    matricule: 'Matricule',
    bornOn: 'Naissance',
    phone: 'Téléphone',
    classroom: 'Classe',
    role: 'Fonction',
};

export const DEFAULT_ID_CARD_ACCENT = '#6425d0';
export const DEFAULT_ID_CARD_BODY = '#ffffff';

/** Students: horizontal. Staff / teachers: vertical. */
export function orientationForKind(kind: IdCardKind): IdCardOrientation {
    return kind === 'staff' ? 'vertical' : 'horizontal';
}

/** Mix an accent hex with white for soft panel fills. */
export function softFromAccent(accent: string, amount = 0.92): string {
    const hex = accent.replace('#', '');
    const full =
        hex.length === 3
            ? hex
                  .split('')
                  .map((char) => char + char)
                  .join('')
            : hex.padEnd(6, '0').slice(0, 6);
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);

    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
        return '#f3edff';
    }

    const mix = (channel: number) =>
        Math.round(channel + (255 - channel) * amount);

    return `rgb(${mix(r)} ${mix(g)} ${mix(b)})`;
}

function QrMark({ value, size = 48 }: { value: string; size?: number }) {
    const modules = useMemo(() => encode(value), [value]);
    const dim = modules.size;
    const cell = size / dim;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            shapeRendering="crispEdges"
            aria-hidden
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
                            fill="currentColor"
                        />
                    ) : null,
                ),
            )}
        </svg>
    );
}

type CardDetail = {
    key: string;
    label: string;
    value: string;
};

function StatusOverlay({
    accent,
    blocked,
    revoked,
}: {
    accent: string;
    blocked: boolean;
    revoked: boolean;
}) {
    if (!revoked && !blocked) {
        return null;
    }

    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/55">
            <span
                className="rotate-[-18deg] rounded-[6px] border-2 px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase"
                style={{
                    borderColor: revoked ? '#b91c1c' : accent,
                    color: revoked ? '#b91c1c' : accent,
                }}
            >
                {revoked ? 'Révoquée' : 'Bloquée'}
            </span>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[1.9mm] font-medium tracking-[0.08em] text-black/40 uppercase">
                {label}
            </p>
            <p className="mt-[0.4mm] truncate text-[2.8mm] leading-[3.2mm] font-bold text-[#121826]">
                {value}
            </p>
        </div>
    );
}

function SchoolMark({
    schoolLogoUrl,
    accent,
    sizeClass,
    ring = false,
}: {
    schoolLogoUrl?: string | null;
    accent: string;
    sizeClass: string;
    ring?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center overflow-hidden bg-white',
                sizeClass,
            )}
            style={ring ? { borderColor: accent } : undefined}
        >
            {schoolLogoUrl ? (
                <img
                    src={schoolLogoUrl}
                    alt=""
                    className="size-full object-cover"
                />
            ) : (
                <span
                    className="text-[10px] font-bold tracking-wide"
                    style={{ color: accent }}
                >
                    YS
                </span>
            )}
        </div>
    );
}

export function IdCardPreview({
    person,
    kind = 'student',
    schoolName,
    schoolCity,
    schoolLogoUrl,
    yearLabel,
    accent = DEFAULT_ID_CARD_ACCENT,
    layout = 'classic',
    showQr = true,
    visibleFields,
    validUntil,
    blocked = false,
    revoked = false,
    className,
}: {
    person: IdCardPerson;
    kind?: IdCardKind;
    schoolName: string;
    schoolMotto?: string;
    schoolCity: string;
    schoolLogoUrl?: string | null;
    yearLabel: string;
    accent?: string;
    bodyColor?: string;
    /** Ignored: orientation is forced by kind. */
    orientation?: IdCardOrientation;
    layout?: IdCardLayout;
    showQr?: boolean;
    visibleFields: IdCardField[];
    validUntil: string;
    blocked?: boolean;
    revoked?: boolean;
    className?: string;
}) {
    const initials = useInitials();
    const isStaff = kind === 'staff';
    const horizontal = !isStaff;
    const headerBg =
        layout === 'split'
            ? `linear-gradient(105deg, ${accent} 0%, ${softFromAccent(accent, 0.35)} 100%)`
            : accent;
    const validityShort =
        yearLabel.match(/\d{4}/g)?.slice(-1)[0] ??
        validUntil.match(/\d{4}/)?.[0] ??
        yearLabel;
    const jobTitle =
        person.fields.role ||
        person.subtitle ||
        (isStaff ? 'Enseignant' : '');

    const details: CardDetail[] = [
        { key: 'name', label: 'Nom complet', value: person.name },
        ...visibleFields
            .map((key) => {
                const value = person.fields[key];

                if (!value) {
                    return null;
                }

                return {
                    key,
                    label: FIELD_PRINT_LABELS[key],
                    value,
                };
            })
            .filter(Boolean) as CardDetail[],
        {
            key: 'year',
            label: 'Année',
            value: yearLabel,
        },
    ];

    return (
        <article
            data-print-root="id-card"
            className={cn(
                'relative overflow-hidden rounded-[3.2mm] border border-black/8 bg-white shadow-[0_12px_28px_rgba(26,18,37,0.14)]',
                className,
            )}
            style={{
                width: horizontal
                    ? `${ID_CARD_WIDTH_MM}mm`
                    : `${ID_CARD_HEIGHT_MM}mm`,
                height: horizontal
                    ? `${ID_CARD_HEIGHT_MM}mm`
                    : `${ID_CARD_WIDTH_MM}mm`,
                color: '#121826',
            }}
        >
            <StatusOverlay
                accent={accent}
                blocked={blocked}
                revoked={revoked}
            />

            {horizontal ? (
                <>
                    <header
                        className="flex items-center gap-[2.4mm] px-[3.2mm] py-[2.4mm] text-white"
                        style={{ background: headerBg }}
                    >
                        <SchoolMark
                            schoolLogoUrl={schoolLogoUrl}
                            accent={accent}
                            sizeClass="size-[9.5mm] rounded-[1.6mm]"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[3.4mm] leading-[3.8mm] font-bold tracking-[0.01em]">
                                {schoolName}
                            </p>
                            <p className="mt-[0.7mm] truncate text-[2mm] leading-none font-medium tracking-[0.08em] uppercase opacity-90">
                                Carte d’identité élève
                            </p>
                        </div>
                    </header>

                    <div
                        className="box-border flex h-[calc(100%-14mm)] flex-col bg-white px-[3.2mm] pt-[2.4mm] pb-[2.4mm]"
                    >
                        <div className="flex min-h-0 flex-1 items-start gap-[3mm]">
                            <div className="flex w-[18mm] shrink-0 flex-col items-center">
                                <Avatar className="size-[17mm] rounded-[2mm]">
                                    {person.photoUrl ? (
                                        <AvatarImage
                                            src={person.photoUrl}
                                            alt={person.name}
                                        />
                                    ) : null}
                                    <AvatarFallback
                                        className="rounded-[2mm] text-[4mm] font-semibold text-white"
                                        style={{ background: accent }}
                                    >
                                        {initials(person.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <p className="mt-[1.4mm] text-center text-[2.1mm] font-bold tracking-[0.06em] uppercase">
                                    Élève
                                </p>
                                <p className="mt-[1.2mm] text-center text-[2mm] font-semibold leading-[2.4mm]">
                                    {schoolCity || '—'}
                                </p>
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col justify-start gap-[1.8mm] pt-[0.5mm]">
                                {details.map((item) => (
                                    <InfoRow
                                        key={item.key}
                                        label={item.label}
                                        value={item.value}
                                    />
                                ))}
                            </div>

                            {showQr ? (
                                <div className="flex shrink-0 items-center self-center text-black/85">
                                    <QrMark
                                        value={`yousch:id:${person.id}`}
                                        size={58}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-[2mm] flex items-end justify-end">
                            <p className="shrink-0 text-[2.2mm] font-semibold">
                                Validité {validityShort}
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex h-full flex-col bg-white">
                    <header className="flex items-center gap-[2mm] px-[3mm] pt-[3.2mm] pb-[2mm]">
                        <SchoolMark
                            schoolLogoUrl={schoolLogoUrl}
                            accent={accent}
                            sizeClass="size-[9mm] rounded-[1.6mm]"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[2.8mm] leading-[3.2mm] font-bold tracking-[0.04em] uppercase">
                                {schoolName}
                            </p>
                            <p className="mt-[0.5mm] text-[1.8mm] tracking-[0.14em] text-black/45 uppercase">
                                {schoolCity || yearLabel}
                            </p>
                        </div>
                    </header>

                    <div className="flex flex-1 flex-col items-center px-[3mm] pt-[1.5mm]">
                        <Avatar
                            className="size-[28mm] rounded-[2mm] border-[0.7mm]"
                            style={{ borderColor: accent }}
                        >
                            {person.photoUrl ? (
                                <AvatarImage
                                    src={person.photoUrl}
                                    alt={person.name}
                                />
                            ) : null}
                            <AvatarFallback
                                className="rounded-[1.4mm] text-[6mm] font-semibold text-white"
                                style={{ background: accent }}
                            >
                                {initials(person.name)}
                            </AvatarFallback>
                        </Avatar>

                        <p className="mt-[2.4mm] max-w-full px-[1mm] text-center text-[3.4mm] leading-[3.8mm] font-bold">
                            {person.name}
                        </p>
                        <p className="mt-[0.8mm] max-w-full truncate px-[1mm] text-center text-[2.3mm] text-black/65">
                            {jobTitle}
                        </p>
                        {person.fields.matricule ? (
                            <p className="mt-[0.6mm] text-center text-[1.9mm] tracking-wide text-black/40">
                                {person.fields.matricule}
                            </p>
                        ) : null}
                    </div>

                    <div
                        className="mt-auto flex items-center justify-center px-[3mm] py-[2.2mm]"
                        style={{ background: accent }}
                    >
                        <p className="text-[2.6mm] font-bold tracking-[0.18em] text-white uppercase">
                            Enseignant
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-[1.2mm] px-[3mm] py-[2.4mm]">
                        {showQr ? (
                            <div className="text-black/85">
                                <QrMark
                                    value={`yousch:id:${person.id}`}
                                    size={46}
                                />
                            </div>
                        ) : null}
                        <p className="text-[1.9mm] font-semibold text-black/55">
                            Validité {validityShort}
                        </p>
                    </div>
                </div>
            )}
        </article>
    );
}
