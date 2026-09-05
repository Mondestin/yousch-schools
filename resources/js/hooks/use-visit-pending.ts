import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function useVisitPending(): boolean {
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const stopStart = router.on('start', (event) => {
            if (event.detail.visit.prefetch) {
                return;
            }

            setPending(true);
        });
        const stopFinish = router.on('finish', (event) => {
            if (event.detail.visit.prefetch) {
                return;
            }

            setPending(false);
        });

        return () => {
            stopStart();
            stopFinish();
        };
    }, []);

    return pending;
}
