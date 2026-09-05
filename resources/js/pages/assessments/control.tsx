import { Head } from '@inertiajs/react';
import { GradeSheet } from '@/components/sms/grade-sheet';
import { index as assessments } from '@/routes/assessments';
import type { SchoolDataset } from '@/types/school';

export default function AssessmentControl({
    catalog,
}: {
    catalog: SchoolDataset;
}) {
    return (
        <>
            <Head title="Contrôle des notes" />
            <GradeSheet catalog={catalog} mode="control" />
        </>
    );
}

AssessmentControl.layout = {
    breadcrumbs: [
        { title: 'Devoirs & notes', href: assessments() },
        { title: 'Contrôle', href: assessments() },
    ],
};
