import { Head } from '@inertiajs/react';
import { GradeSheet } from '@/components/sms/grade-sheet';
import { devoirs, entry } from '@/routes/assessments';
import type { SchoolDataset } from '@/types/school';

export default function AssessmentEntry({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    return (
        <>
            <Head title="Saisie des notes" />
            <GradeSheet catalog={catalog} mode="entry" />
        </>
    );
}

AssessmentEntry.layout = {
    breadcrumbs: [
        { title: 'Évaluations', href: devoirs() },
        { title: 'Saisie', href: entry() },
    ],
};
