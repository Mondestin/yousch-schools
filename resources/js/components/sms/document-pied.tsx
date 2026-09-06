import { cn } from '@/lib/utils';

/**
 * Congo (Brazzaville) tricolor for document footers:
 * equal green | yellow | red bands with a barely slanted yellow band.
 */
function CongoFlagStrip({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 900 60"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <rect width="900" height="60" fill="#009543" />
            <polygon points="600,0 900,0 900,60 588,60" fill="#DC241F" />
            <polygon points="300,0 600,0 588,60 288,60" fill="#FCD116" />
        </svg>
    );
}

/** Full-width Congo flag strip for printable documents. */
export function DocumentPied({ className }: { className?: string }) {
    return (
        <div className={cn('document-pied', className)} aria-hidden="true">
            <CongoFlagStrip className="document-pied-svg" />
        </div>
    );
}

/** Inline SVG markup for print / PDF HTML windows. */
export function documentPiedSvgHtml(): string {
    return `<svg class="document-pied-svg" viewBox="0 0 900 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="900" height="60" fill="#009543" />
  <polygon points="600,0 900,0 900,60 588,60" fill="#DC241F" />
  <polygon points="300,0 600,0 588,60 288,60" fill="#FCD116" />
</svg>`;
}
