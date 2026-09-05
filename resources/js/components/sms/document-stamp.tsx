import { cn } from '@/lib/utils';

export function DocumentStamp({
    url,
    className,
}: {
    url: string | null;
    className?: string;
}) {
    if (!url) {
        return null;
    }

    return (
        <img
            src={url}
            alt="Cachet et signature"
            className={cn('h-24 w-40 object-contain', className)}
        />
    );
}
