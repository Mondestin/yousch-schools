import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export type ProfileMetaItem = {
    label: string;
    value: string;
};

export function PersonProfileHeader({
    name,
    photoUrl,
    code,
    badges,
    metaLine,
    phone,
    email,
    details,
    status,
    className,
}: {
    name: string;
    photoUrl?: string | null;
    code: string;
    badges?: ReactNode;
    metaLine?: string;
    phone?: string | null;
    email?: string | null;
    details: ProfileMetaItem[];
    status: {
        label: string;
        title: string;
        rows: ProfileMetaItem[];
    };
    className?: string;
}) {
    const initials = useInitials();

    return (
        <section
            className={cn(
                'border-border mx-6 mt-5 shrink-0 rounded-[14px] border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
                className,
            )}
        >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(12rem,15rem)] xl:items-stretch">
                <div className="flex min-w-0 items-start gap-4">
                    <Avatar className="size-[4.5rem] shrink-0 rounded-full border border-black/5 shadow-sm">
                        {photoUrl ? (
                            <AvatarImage
                                src={photoUrl}
                                alt={name}
                                className="object-cover"
                            />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[1.1rem] font-semibold">
                            {initials(name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-2">
                        <div>
                            <h1 className="text-[1.35rem] leading-7 font-semibold tracking-tight">
                                {name}
                            </h1>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 font-mono text-[11px] font-medium">
                                    {code}
                                </span>
                                {badges}
                            </div>
                            {metaLine ? (
                                <p className="text-muted-foreground mt-1.5 text-[13px]">
                                    {metaLine}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
                            {phone ? (
                                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                                    <Phone className="size-3.5 shrink-0" />
                                    <span className="text-foreground">
                                        {phone}
                                    </span>
                                </span>
                            ) : null}
                            {email ? (
                                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                                    <Mail className="size-3.5 shrink-0" />
                                    <span className="text-foreground truncate">
                                        {email}
                                    </span>
                                </span>
                            ) : null}
                            {!phone && !email ? (
                                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                                    <MapPin className="size-3.5 shrink-0" />
                                    Coordonnées non renseignées
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <dl className="border-border grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5">
                    {details.map((item) => (
                        <div key={item.label} className="min-w-0">
                            <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                                {item.label}
                            </dt>
                            <dd className="mt-0.5 truncate text-[13px] font-medium">
                                {item.value || '-'}
                            </dd>
                        </div>
                    ))}
                </dl>

                <aside className="bg-primary text-primary-foreground flex flex-col justify-between rounded-[12px] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div>
                        <p className="text-[11px] font-medium tracking-wide uppercase opacity-80">
                            {status.label}
                        </p>
                        <p className="mt-1 text-[1.05rem] leading-6 font-semibold">
                            {status.title}
                        </p>
                    </div>
                    <dl className="mt-4 space-y-2 text-[12px]">
                        {status.rows.map((row) => (
                            <div
                                key={row.label}
                                className="flex items-start justify-between gap-3"
                            >
                                <dt className="opacity-75">{row.label}</dt>
                                <dd className="text-right font-medium">
                                    {row.value || '-'}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </aside>
            </div>
        </section>
    );
}

export function DetailSectionCard({
    title,
    description,
    action,
    children,
    className,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'border-border rounded-[12px] border bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
                className,
            )}
        >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold">{title}</h2>
                    {description ? (
                        <p className="text-muted-foreground mt-0.5 text-[12px]">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export function ageFromBornOn(bornOn: string | null | undefined): number | null {
    if (!bornOn) {
        return null;
    }

    const birth = new Date(`${bornOn.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(birth.getTime())) {
        return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDelta = today.getMonth() - birth.getMonth();

    if (
        monthDelta < 0 ||
        (monthDelta === 0 && today.getDate() < birth.getDate())
    ) {
        age -= 1;
    }

    return age >= 0 ? age : null;
}

export function DetailQuickAction({
    icon: Icon,
    label,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="border-border hover:bg-muted/50 flex flex-col items-center gap-2 rounded-[10px] border bg-white px-2 py-3 text-center transition-colors"
        >
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
                <Icon className="size-4" />
            </span>
            <span className="text-muted-foreground text-[11px] leading-4 font-medium">
                {label}
            </span>
        </button>
    );
}
