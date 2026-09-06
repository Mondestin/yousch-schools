export function InfoField({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    return (
        <div className="grid gap-1">
            <p className="text-muted-foreground text-[12px]">{label}</p>
            <p className="text-[13px]">
                {value === '' || value == null ? '-' : value}
            </p>
        </div>
    );
}
