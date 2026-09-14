import { DocumentStamp } from '@/components/sms/document-stamp';
import { cn } from '@/lib/utils';

/**
 * Date + cachet above the signatory title/name.
 * Block sits on the right half of the page without hugging the margin.
 */
export function DocumentSignatureBlock({
    city,
    issuedOn,
    stampUrl,
    role = 'Le chef d’établissement',
    name,
    className,
}: {
    city: string;
    issuedOn: string;
    stampUrl: string | null;
    role?: string;
    name: string;
    className?: string;
}) {
    return (
        <div className={cn('mt-10 flex justify-end pr-12 sm:pr-20', className)}>
            <div className="w-max max-w-full min-w-[20rem] text-center text-[14px] leading-5">
                <p className="whitespace-nowrap">
                    Fait à {city}, le {issuedOn}
                </p>
                <div className="mt-4 flex flex-col items-center">
                    <DocumentStamp
                        url={stampUrl}
                        className="mt-0 h-28 w-44 shrink-0"
                    />
                    <p className="mt-2 font-medium">
                        {role}
                        <br />
                        <strong>{name}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
