import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link
            className={cn(
                'text-primary decoration-primary/30 hover:decoration-primary underline underline-offset-4 transition-colors duration-300 ease-out',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
