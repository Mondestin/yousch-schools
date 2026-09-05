import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function SearchInput({
    className,
    wrapperClassName,
    ...props
}: ComponentProps<typeof Input> & { wrapperClassName?: string }) {
    return (
        <div
            className={cn(
                'relative max-w-xs min-w-[200px] flex-1',
                wrapperClassName,
            )}
        >
            <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
                aria-hidden
            />
            <Input
                className={cn(
                    'h-8 rounded-[8px] pl-8 text-[13px] shadow-none',
                    className,
                )}
                {...props}
            />
        </div>
    );
}
