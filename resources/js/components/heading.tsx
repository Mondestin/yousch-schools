export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header className={variant === 'small' ? '' : 'mb-8 space-y-0.5'}>
            <h2
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-[13px] font-semibold'
                        : 'text-[22px] font-semibold tracking-tight'
                }
            >
                {title}
            </h2>
            {description && (
                <p className="text-muted-foreground text-[13px]">
                    {description}
                </p>
            )}
        </header>
    );
}
