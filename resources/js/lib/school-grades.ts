import { cycleLabel, personName } from '@/lib/school-rows';
import { mentionForScore } from '@/lib/school-students';
import type {
    Assessment,
    AssessmentType,
    Classroom,
    CycleYearFilter,
    SchoolDataset,
} from '@/types/school';

export const ASSESSMENT_TYPES: AssessmentType[] = [
    'devoir',
    'composition',
    'examen',
];

export function parseNote(value: string): number | null {
    const trimmed = value.trim().replace(',', '.');

    if (trimmed === '') {
        return null;
    }

    const score = Number(trimmed);

    return Number.isFinite(score) ? score : Number.NaN;
}

export function isNoteInRange(score: number): boolean {
    return Number.isFinite(score) && score >= 0 && score <= 20;
}

export function formatNote(score: number): string {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: Number.isInteger(score) ? 0 : 1,
        maximumFractionDigits: 2,
    }).format(score);
}

export function classroomSubjects(
    catalog: SchoolDataset,
    classroom: Classroom,
) {
    return catalog.subjects.filter(
        (subject) =>
            subject.cycle === classroom.cycle &&
            subject.gradeLevelId === classroom.gradeLevelId &&
            (classroom.trackId === null ||
                subject.trackId === null ||
                subject.trackId === classroom.trackId),
    );
}

export function gradeGrid(catalog: SchoolDataset, assessmentId: string) {
    const assessment = catalog.assessments.find(
        (item) => item.id === assessmentId,
    );

    if (!assessment) {
        return null;
    }

    const classroom = catalog.classrooms.find(
        (item) => item.id === assessment.classroomId,
    );
    const subject = catalog.subjects.find(
        (item) => item.id === assessment.subjectId,
    );
    const term = catalog.terms.find((item) => item.id === assessment.termId);
    const rows = catalog.enrollments
        .filter(
            (enrollment) =>
                enrollment.classroomId === assessment.classroomId &&
                enrollment.status === 'inscrit',
        )
        .map((enrollment) => {
            const student = catalog.students.find(
                (item) => item.id === enrollment.studentId,
            );
            const grade = catalog.grades.find(
                (item) =>
                    item.enrollmentId === enrollment.id &&
                    item.assessmentId === assessmentId,
            );

            return {
                enrollmentId: enrollment.id,
                studentId: enrollment.studentId,
                matricule: student?.matricule ?? '-',
                lastName: student?.lastName ?? '',
                firstName: student?.firstName ?? '',
                name: student ? personName(student) : '-',
                photoUrl: student?.photoUrl ?? null,
                gradeId: grade?.id ?? null,
                score: grade?.score ?? null,
            };
        })
        .sort(
            (left, right) =>
                left.lastName.localeCompare(right.lastName, 'fr') ||
                left.firstName.localeCompare(right.firstName, 'fr'),
        );

    return {
        assessment,
        classroom,
        classroomName: classroom?.name ?? '-',
        subjectName: subject?.name ?? '-',
        termName: term?.name ?? '-',
        rows,
    };
}

function mean(scores: number[]): number | null {
    if (scores.length === 0) {
        return null;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function subjectTermAverage(
    devoirs: number[],
    compositions: number[],
): number | null {
    const devoir = mean(devoirs);
    const composition = mean(compositions);

    if (devoir !== null && composition !== null) {
        return (devoir + composition) / 2;
    }

    return devoir ?? composition;
}

function appreciationForMention(mention: string | null): string {
    if (mention === 'Très bien') {
        return 'Excellent trimestre. Poursuivez ainsi.';
    }

    if (mention === 'Bien') {
        return 'Bon trimestre. Encore un effort pour viser l’excellence.';
    }

    if (mention === 'Assez bien') {
        return 'Trimestre satisfaisant. Plus de régularité est souhaitée.';
    }

    if (mention === 'Passable') {
        return 'Résultats passables. Un travail plus assidu s’impose.';
    }

    return 'Résultats insuffisants. Un suivi rapproché est nécessaire.';
}

export function bulletinFiche(
    catalog: SchoolDataset,
    studentId: string,
    termId: string,
) {
    const student = catalog.students.find((item) => item.id === studentId);

    if (!student) {
        return null;
    }

    const term = catalog.terms.find((item) => item.id === termId) ?? null;
    const enrollment =
        catalog.enrollments.find(
            (item) =>
                item.studentId === studentId &&
                (!term || item.academicYearId === term.academicYearId),
        ) ??
        catalog.enrollments.find((item) => item.studentId === studentId) ??
        null;

    if (!enrollment || !term) {
        return null;
    }

    const classroom =
        catalog.classrooms.find((item) => item.id === enrollment.classroomId) ??
        null;
    const year =
        catalog.academicYears.find(
            (item) => item.id === enrollment.academicYearId,
        ) ?? null;
    const track = enrollment.trackId
        ? (catalog.tracks.find((item) => item.id === enrollment.trackId) ??
          null)
        : null;

    if (!classroom) {
        return null;
    }

    const termAssessments = catalog.assessments.filter(
        (assessment) =>
            assessment.termId === term.id &&
            assessment.classroomId === classroom.id,
    );
    const subjects = classroomSubjects(catalog, classroom);
    const lines = subjects.map((subject) => {
        const notes = catalog.grades.filter(
            (grade) =>
                grade.enrollmentId === enrollment.id &&
                grade.subjectId === subject.id &&
                termAssessments.some(
                    (assessment) => assessment.id === grade.assessmentId,
                ),
        );
        const devoirs = notes
            .filter((grade) => {
                const assessment = termAssessments.find(
                    (item) => item.id === grade.assessmentId,
                );

                return assessment?.type === 'devoir';
            })
            .map((grade) => grade.score);
        const compositions = notes
            .filter((grade) => {
                const assessment = termAssessments.find(
                    (item) => item.id === grade.assessmentId,
                );

                return (
                    assessment?.type === 'composition' ||
                    assessment?.type === 'examen'
                );
            })
            .map((grade) => grade.score);
        const average = subjectTermAverage(devoirs, compositions);
        const coefficient = subject.coefficient ?? 1;

        return {
            subjectId: subject.id,
            code: subject.code,
            name: subject.name,
            coefficient,
            devoir: mean(devoirs),
            composition: mean(compositions),
            average,
            weighted: average === null ? null : average * coefficient,
        };
    });
    const scored = lines.filter((line) => line.average !== null);
    const weightSum = scored.reduce((sum, line) => sum + line.coefficient, 0);
    const average =
        weightSum === 0
            ? null
            : scored.reduce((sum, line) => sum + (line.weighted ?? 0), 0) /
              weightSum;
    const mention = average === null ? null : mentionForScore(catalog, average);
    const classmates = catalog.enrollments.filter(
        (item) =>
            item.classroomId === classroom.id && item.status === 'inscrit',
    );
    const standings = classmates
        .map((item) => {
            const peer = bulletinAverages(catalog, item.id, termAssessments);

            return {
                enrollmentId: item.id,
                average: peer,
            };
        })
        .filter((item) => item.average !== null)
        .sort((left, right) => (right.average ?? 0) - (left.average ?? 0));
    const rankIndex = standings.findIndex(
        (item) => item.enrollmentId === enrollment.id,
    );

    return {
        student,
        enrollment,
        classroom,
        year,
        track,
        term,
        name: personName(student),
        classroomName: classroom.name,
        cycleName: cycleLabel(classroom.cycle),
        yearLabel: year?.label ?? '-',
        trackCode: track?.code ?? null,
        lines,
        average,
        totalGeneral: scored.reduce(
            (sum, line) => sum + (line.weighted ?? 0),
            0,
        ),
        mention,
        result: average === null ? null : average >= 10 ? 'Admis' : 'Échoué',
        rank: rankIndex === -1 ? null : rankIndex + 1,
        classSize: standings.length,
        appreciation: appreciationForMention(mention),
        profile: catalog.profile,
        issuedOn: new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date()),
    };
}

function bulletinAverages(
    catalog: SchoolDataset,
    enrollmentId: string,
    termAssessments: Assessment[],
): number | null {
    const enrollment = catalog.enrollments.find(
        (item) => item.id === enrollmentId,
    );

    if (!enrollment) {
        return null;
    }

    const classroom = catalog.classrooms.find(
        (item) => item.id === enrollment.classroomId,
    );

    if (!classroom) {
        return null;
    }

    const lines = classroomSubjects(catalog, classroom)
        .map((subject) => {
            const notes = catalog.grades.filter(
                (grade) =>
                    grade.enrollmentId === enrollmentId &&
                    grade.subjectId === subject.id &&
                    termAssessments.some(
                        (assessment) => assessment.id === grade.assessmentId,
                    ),
            );
            const devoirs = notes
                .filter((grade) => {
                    const assessment = termAssessments.find(
                        (item) => item.id === grade.assessmentId,
                    );

                    return assessment?.type === 'devoir';
                })
                .map((grade) => grade.score);
            const compositions = notes
                .filter((grade) => {
                    const assessment = termAssessments.find(
                        (item) => item.id === grade.assessmentId,
                    );

                    return (
                        assessment?.type === 'composition' ||
                        assessment?.type === 'examen'
                    );
                })
                .map((grade) => grade.score);

            return {
                coefficient: subject.coefficient ?? 1,
                average: subjectTermAverage(devoirs, compositions),
            };
        })
        .filter((line) => line.average !== null);
    const weightSum = lines.reduce((sum, line) => sum + line.coefficient, 0);

    if (weightSum === 0) {
        return null;
    }

    return (
        lines.reduce(
            (sum, line) => sum + (line.average ?? 0) * line.coefficient,
            0,
        ) / weightSum
    );
}

export function defaultTermId(
    catalog: SchoolDataset,
    filter: CycleYearFilter,
): string {
    return (
        catalog.terms.find(
            (term) =>
                term.academicYearId === filter.academicYearId &&
                term.position === 1,
        )?.id ??
        catalog.terms.find(
            (term) => term.academicYearId === filter.academicYearId,
        )?.id ??
        ''
    );
}

export type BulletinFiche = NonNullable<ReturnType<typeof bulletinFiche>>;
export type GradeGrid = NonNullable<ReturnType<typeof gradeGrid>>;

export function classResults(
    catalog: SchoolDataset,
    classroomId: string,
    termId: string,
) {
    const classroom = catalog.classrooms.find(
        (item) => item.id === classroomId,
    );
    const term = catalog.terms.find((item) => item.id === termId);

    if (!classroom || !term) {
        return null;
    }

    const rows = catalog.enrollments
        .filter(
            (enrollment) =>
                enrollment.classroomId === classroomId &&
                enrollment.status === 'inscrit',
        )
        .map((enrollment) => {
            const fiche = bulletinFiche(catalog, enrollment.studentId, termId);

            return fiche
                ? {
                      studentId: enrollment.studentId,
                      matricule: fiche.student.matricule,
                      name: fiche.name,
                      average: fiche.average,
                      mention: fiche.mention,
                      result: fiche.result,
                      rank: fiche.rank,
                  }
                : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((left, right) => (left.rank ?? 99) - (right.rank ?? 99));

    const scored = rows.filter((row) => row.average !== null);
    const admitted = scored.filter((row) => row.result === 'Admis').length;

    return {
        classroom,
        term,
        rows,
        admitted,
        failed: scored.filter((row) => row.result === 'Échoué').length,
        classAverage:
            scored.length === 0
                ? null
                : scored.reduce((sum, row) => sum + (row.average ?? 0), 0) /
                  scored.length,
    };
}
