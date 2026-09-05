import { Head } from '@inertiajs/react';
import { GradeSheet } from '@/components/sms/grade-sheet';
import { index as assessments } from '@/routes/assessments';
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
        { title: 'Devoirs & notes', href: assessments() },
        { title: 'Saisie', href: assessments() },
    ],
};
