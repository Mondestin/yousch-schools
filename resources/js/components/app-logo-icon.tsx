import { cn } from '@/lib/utils';

/**
 * Square crop of the wordmark. The brand asset is a wide lockup, so square
 * slots (collapsed sidebar, favicons, auth tiles) show its leading glyph.
 */
export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <img
            src="/logo.png"
            alt=""
            aria-hidden
            className={cn('object-cover object-left', className)}
        />
    );
}
