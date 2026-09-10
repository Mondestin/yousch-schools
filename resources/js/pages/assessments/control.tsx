import { Head } from '@inertiajs/react';
import { GradeSheet } from '@/components/sms/grade-sheet';
import { control, devoirs } from '@/routes/assessments';
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
        { title: 'Évaluations', href: devoirs() },
        { title: 'Contrôle', href: control() },
    ],
};
