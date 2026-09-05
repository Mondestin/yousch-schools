import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormSection({
    title,
    description,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className="overflow-hidden rounded-[8px] border">
            <header className="border-b px-5 py-3">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                    {Icon ? <Icon className="text-primary size-4" /> : null}
                    {title}
                </h2>
                {description ? (
                    <p className="text-muted-foreground mt-0.5 text-[13px] leading-relaxed">
                        {description}
                    </p>
                ) : null}
            </header>
            <div className={cn('p-5', className)}>{children}</div>
        </section>
    );
}

export function FormPreview({
    photoUrl,
    name,
    fallback,
    hint,
    details,
    children,
}: {
    photoUrl: string | null;
    name: string;
    fallback: string;
    hint?: string;
    details: Array<{ label: string; value: string }>;
    children?: ReactNode;
}) {
    const display = name.trim() === '' ? fallback : name;

    return (
        <aside className="overflow-hidden rounded-[8px] border xl:sticky xl:top-4">
            <div className="flex flex-col items-center gap-3 border-b px-5 py-6 text-center">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt=""
                        className="size-24 rounded-[8px] border object-cover"
                    />
                ) : (
                    <div className="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-[8px] border text-[22px] font-semibold">
                        {initials(display === fallback ? '' : display)}
                    </div>
                )}
                <div className="min-w-0 space-y-1">
                    <p className="text-[16px] font-semibold tracking-tight">
                        {display}
                    </p>
                    {hint ? (
                        <p className="text-muted-foreground text-[13px]">
                            {hint}
                        </p>
                    ) : null}
                </div>
            </div>
            <dl className="space-y-3 px-5 py-4">
                {details.map((item) => (
                    <div key={item.label}>
                        <dt className="text-muted-foreground text-[12px]">
                            {item.label}
                        </dt>
                        <dd className="mt-0.5 text-[13px] font-medium">
                            {item.value}
                        </dd>
                    </div>
                ))}
            </dl>
            {children}
        </aside>
    );
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

    if (parts.length === 0) {
        return '?';
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}
