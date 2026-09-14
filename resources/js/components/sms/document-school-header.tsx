import { COUNTRY_SHORT } from '@/lib/school-rows';
import { cn } from '@/lib/utils';
import type { SchoolProfile } from '@/types/school';

/** School logo then name — used on printable docs. */
export function DocumentSchoolHeader({
    profile,
    number,
    className,
    compact = false,
}: {
    profile: Pick<
        SchoolProfile,
        'name' | 'motto' | 'phone' | 'email' | 'address' | 'city' | 'logoUrl'
    >;
    number?: string | null;
    className?: string;
    compact?: boolean;
}) {
    return (
        <header
            className={cn(
                'text-center text-[13px] leading-5',
                className,
            )}
        >
            {profile.logoUrl ? (
                <img
                    src={profile.logoUrl}
                    alt=""
                    className={cn(
                        'mx-auto object-contain',
                        compact ? 'mb-1.5 h-16 w-24' : 'mb-2 h-24 w-32',
                    )}
                />
            ) : null}
            <p className="text-[16px] font-semibold uppercase tracking-[0.02em]">
                {profile.name}
            </p>
            {profile.motto ? (
                <p className="text-[13px] font-medium">{profile.motto}</p>
            ) : null}
            {profile.address ? (
                <p className="text-black/70">{profile.address}</p>
            ) : null}
            <p className="text-black/70">
                {[
                    profile.city ? `${profile.city}, ${COUNTRY_SHORT}` : null,
                    profile.phone || null,
                ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
            {profile.email ? (
                <p className="text-black/70">{profile.email}</p>
            ) : null}
            {number ? (
                <p className="mt-2 font-mono text-[12px] tracking-wide text-black/60">
                    N° {number}
                </p>
            ) : null}
        </header>
    );
}
