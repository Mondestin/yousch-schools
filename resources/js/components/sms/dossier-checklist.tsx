import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DOSSIER_SLOTS,
    evaluateDossier,
    type DossierStatus,
} from '@/lib/school-dossier';
import { cn } from '@/lib/utils';
import type { DossierFile } from '@/types/school';

export function DossierChecklistPanel({
    photoUrl,
    files,
    className,
}: {
    photoUrl?: string | null;
    files: Array<Pick<DossierFile, 'name'> | { name: string }>;
    className?: string;
}) {
    const status = evaluateDossier(photoUrl, files);

    return (
        <div
            className={cn(
                'rounded-[10px] border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
                className,
            )}
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold">Pièces attendues</p>
                <Badge variant={status.complete ? 'success' : 'warning'}>
                    {status.complete
                        ? 'Dossier complet'
                        : `${status.missing.length} manquante${status.missing.length > 1 ? 's' : ''}`}
                </Badge>
            </div>
            <ul className="space-y-2">
                {DOSSIER_SLOTS.map((slot) => {
                    const ok = status.present.includes(slot.code);

                    return (
                        <li
                            key={slot.code}
                            className="flex items-center gap-2 text-[13px]"
                        >
                            {ok ? (
                                <CheckCircle2 className="text-success size-4 shrink-0" />
                            ) : (
                                <CircleAlert className="text-warning size-4 shrink-0" />
                            )}
                            <span
                                className={
                                    ok
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                }
                            >
                                {slot.label}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function dossierStatusBadge(status: DossierStatus) {
    if (status.complete) {
        return { label: 'Complet', variant: 'success' as const };
    }

    return {
        label: `${status.missing.length} manq.`,
        variant: 'warning' as const,
    };
}
