import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground field-sizing-content flex min-h-16 w-full rounded-[8px] border bg-transparent px-3 py-2 text-[13px] shadow-none transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                'focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-1',
                'aria-invalid:ring-primary/20 aria-invalid:border-primary aria-invalid:ring-1',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
