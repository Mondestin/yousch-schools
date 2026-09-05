import { COUNTRY_SHORT } from '@/lib/school-rows';
import type { SchoolProfile } from '@/types/school';

export function BulletinLetterhead({
    profile,
    logoUrl,
}: {
    profile: Pick<
        SchoolProfile,
        'name' | 'motto' | 'phone' | 'email' | 'address' | 'city'
    >;
    logoUrl?: string | null;
}) {
    return (
        <div className="text-center text-[12px] leading-5">
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt=""
                    className="mx-auto mb-2 h-24 w-32 object-contain"
                />
            ) : null}
            <p className="text-[14px] font-semibold uppercase">
                {profile.name}
            </p>
            {profile.motto ? (
                <p className="text-[13px] font-medium">{profile.motto}</p>
            ) : null}
            {profile.phone ? <p>Tél. : {profile.phone}</p> : null}
            {profile.email ? <p>E-mail : {profile.email}</p> : null}
            {profile.address ? <p>{profile.address}</p> : null}
            <p>
                {profile.city}, {COUNTRY_SHORT}
            </p>
        </div>
    );
}
