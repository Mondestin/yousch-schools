import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export function PersonCell({
    name,
    hint,
    label,
    photoUrl,
}: {
    /** Full name, used for the initials fallback and the image alt text. */
    name: string;
    hint?: string | null;
    /** Shown instead of the full name when the table splits name columns. */
    label?: ReactNode;
    photoUrl?: string | null;
}) {
    const initials = useInitials();

    return (
        <div className="flex items-center gap-3">
            <Avatar className="size-8">
                {photoUrl ? <AvatarImage src={photoUrl} alt={name} /> : null}
                <AvatarFallback className="bg-muted text-[11px] font-medium">
                    {initials(name)}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="font-medium">{label ?? name}</p>
                {hint && (
                    <p className="text-muted-foreground text-[12px]">{hint}</p>
                )}
            </div>
        </div>
    );
}
