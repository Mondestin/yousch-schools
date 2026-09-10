import { usePage } from '@inertiajs/react';
import { ClipboardList, Hash, PenLine, School, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { AssessmentTypeBadge, CodeBadge } from '@/components/sms/code-badge';
import {
    DATA_TABLE_CONTAINER,
    DataTableColumnHeader,
} from '@/components/sms/data-table';
import { Field } from '@/components/sms/field';
import { ListPage } from '@/components/sms/list-page';
import { NoteInput } from '@/components/sms/note-input';
import { PersonCell } from '@/components/sms/person-cell';
import { SearchSelect } from '@/components/sms/search-select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useClientTable } from '@/hooks/use-client-table';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSchoolContext } from '@/hooks/use-school-context';
import {
    formatNote,
    gradeGrid,
    isNoteInRange,
    parseNote,
} from '@/lib/school-grades';
import {
    canEnterGrades,
    gradesBlockedHint,
    windowFor,
} from '@/lib/school-marking-windows';
import { todayIso } from '@/lib/school-rows';
import { toastApiError, toastSaved } from '@/lib/school-toast';
import { ApiError, apiData } from '@/lib/api';
import { upsert as upsertGrades } from '@/routes/api/v1/grades';
import type { Grade, SchoolDataset } from '@/types/school';

type ControlTarget = {
    enrollmentId: string;
    name: string;
    value: string;
};

const controlScoreSchema = z.object({
    controlScore: z.string().refine((value) => {
        const parsed = parseNote(value);

        return parsed === null || isNoteInRange(parsed);
    }, 'La note doit être comprise entre 0 et 20.'),
});

function queryParam(url: string, key: string): string {
    const query = url.includes('?') ? (url.split('?')[1] ?? '') : '';

    return new URLSearchParams(query).get(key) ?? '';
}

export function GradeSheet({
    catalog,
    mode,
}: {
    catalog: SchoolDataset;
    mode: 'entry' | 'control';
}) {
    const { url } = usePage();
    const { filter, staffRole } = useSchoolContext();
    const isPrivileged =
        staffRole === 'admin' || staffRole === 'directeur';
    const today = todayIso();
    const classrooms = catalog.classrooms.filter(
        (classroom) =>
            classroom.cycle === filter.cycle &&
            classroom.academicYearId === filter.academicYearId,
    );
    const [classroomId, setClassroomId] = useState(
        () => queryParam(url, 'classe') || classrooms[0]?.id || '',
    );
    const classroomAssessments = catalog.assessments.filter(
        (assessment) => assessment.classroomId === classroomId,
    );
    const [assessmentId, setAssessmentId] = useState(
        () =>
            queryParam(url, 'evaluation') || classroomAssessments[0]?.id || '',
    );
    const [search, setSearch] = useState('');
    const [grades, setGrades] = useState<Grade[]>(catalog.grades);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [control, setControl] = useState<ControlTarget | null>(null);
    const { errors, clearErrors, validate, showErrors } = useFieldErrors();
    const [saving, setSaving] = useState(false);
    const working = useMemo(() => ({ ...catalog, grades }), [catalog, grades]);
    const grid = assessmentId ? gradeGrid(working, assessmentId) : null;
    const markingWindow = grid
        ? windowFor(catalog, grid.assessment.termId, grid.assessment.type)
        : null;
    const canEditScores = grid
        ? canEnterGrades(
              markingWindow,
              grid.assessment.type,
              isPrivileged,
              today,
          )
        : false;
    const scoresBlockedHint = grid
        ? gradesBlockedHint(
              markingWindow,
              grid.assessment.type,
              isPrivileged,
              today,
          )
        : null;
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const source = grid?.rows ?? [];

        if (needle === '') {
            return source;
        }

        return source.filter((row) =>
            `${row.matricule} ${row.name} ${row.lastName} ${row.firstName}`
                .toLowerCase()
                .includes(needle),
        );
    }, [grid, search]);
    const table = useClientTable(rows);

    function selectClassroom(value: string): void {
        const next = catalog.assessments.find(
            (assessment) => assessment.classroomId === value,
        );
        setClassroomId(value);
        setAssessmentId(next?.id ?? '');
        setDrafts({});
        setSearch('');
    }

    function scoreValue(enrollmentId: string, score: number | null): string {
        if (drafts[enrollmentId] !== undefined) {
            return drafts[enrollmentId];
        }

        return score === null ? '' : String(score);
    }

    async function saveAll(): Promise<void> {
        if (!assessmentId || !grid) {
            return;
        }

        if (!canEditScores) {
            toast.error(
                scoresBlockedHint ??
                    'La saisie des notes n’est pas autorisée pour cette évaluation.',
            );

            return;
        }

        const invalid = grid.rows.some((row) => {
            const raw = scoreValue(row.enrollmentId, row.score);
            const parsed = parseNote(raw);

            return parsed !== null && !isNoteInRange(parsed);
        });

        if (invalid) {
            toast.error('Une note dépasse 20 ou n’est pas valide.');

            return;
        }

        const gradesPayload = grid.rows
            .map((row) => {
                const raw = scoreValue(row.enrollmentId, row.score);
                const parsed = parseNote(raw);

                if (parsed === null) {
                    return null;
                }

                return {
                    enrollmentId: row.enrollmentId,
                    score: parsed,
                };
            })
            .filter(
                (item): item is { enrollmentId: string; score: number } =>
                    item !== null,
            );

        if (gradesPayload.length === 0) {
            toast.error('Aucune note à enregistrer.');

            return;
        }

        setSaving(true);

        try {
            const saved = await apiData<Grade[]>(upsertGrades.url(), {
                method: 'PUT',
                body: {
                    assessmentId,
                    grades: gradesPayload,
                },
            });

            setGrades((current) => {
                const others = current.filter(
                    (grade) => grade.assessmentId !== assessmentId,
                );

                return [...others, ...saved];
            });
            setDrafts({});
            toastSaved();
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    async function confirmControl(): Promise<void> {
        if (!control || !assessmentId) {
            return;
        }

        if (!canEditScores) {
            toast.error(
                scoresBlockedHint ??
                    'La saisie des notes n’est pas autorisée pour cette évaluation.',
            );

            return;
        }

        if (!validate(controlScoreSchema, { controlScore: control.value })) {
            return;
        }

        const parsed = parseNote(control.value);

        if (parsed === null || !isNoteInRange(parsed)) {
            toast.error('La note doit être comprise entre 0 et 20.');

            return;
        }

        setSaving(true);

        try {
            const saved = await apiData<Grade[]>(upsertGrades.url(), {
                method: 'PUT',
                body: {
                    assessmentId,
                    grades: [
                        {
                            enrollmentId: control.enrollmentId,
                            score: parsed,
                        },
                    ],
                },
            });

            setGrades((current) => {
                const others = current.filter(
                    (grade) =>
                        !(
                            grade.enrollmentId === control.enrollmentId &&
                            grade.assessmentId === assessmentId
                        ),
                );

                return [...others, ...saved];
            });
            setDrafts((current) => {
                const next = { ...current };
                delete next[control.enrollmentId];

                return next;
            });
            setControl(null);
            toastSaved();
        } catch (error) {
            if (error instanceof ApiError) {
                const fields = error.fieldErrors();

                if (Object.keys(fields).length > 0) {
                    showErrors(fields);
                }
            }

            toastApiError(error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {scoresBlockedHint ? (
                <Alert className="mx-6 mb-4 w-auto">
                    <ClipboardList />
                    <AlertTitle>Saisie limitée</AlertTitle>
                    <AlertDescription>{scoresBlockedHint}</AlertDescription>
                </Alert>
            ) : null}
            <ListPage
                embedded
                title={mode === 'entry' ? 'Saisie' : 'Contrôle'}
                icon={ClipboardList}
                description={
                    grid
                        ? `${grid.classroomName} · ${grid.assessment.name}`
                        : 'Choisissez une classe et une évaluation.'
                }
                searchPlaceholder="Rechercher un élève, un matricule..."
                search={search}
                onSearchChange={setSearch}
                filters={
                    <>
                        <SearchSelect
                            value={classroomId}
                            onValueChange={selectClassroom}
                            className="w-[11rem]"
                            aria-label="Classe"
                            placeholder="Classe"
                            searchPlaceholder="Rechercher une classe..."
                            options={classrooms.map((classroom) => ({
                                value: classroom.id,
                                label: classroom.name,
                            }))}
                        />
                        <SearchSelect
                            value={assessmentId}
                            onValueChange={(value) => {
                                setAssessmentId(value);
                                setDrafts({});
                                setSearch('');
                            }}
                            className="w-[16rem]"
                            aria-label="Évaluation"
                            placeholder="Évaluation"
                            searchPlaceholder="Rechercher une évaluation..."
                            options={classroomAssessments.map((assessment) => ({
                                value: assessment.id,
                                label: assessment.name,
                            }))}
                        />
                    </>
                }
                actions={
                    mode === 'entry' ? (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                                void saveAll();
                            }}
                            disabled={!grid || saving || !canEditScores}
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </Button>
                    ) : undefined
                }
                empty={{
                    title: search.trim()
                        ? 'Aucun résultat'
                        : grid
                          ? 'Aucun élève'
                          : 'Aucune évaluation',
                    description: search.trim()
                        ? undefined
                        : grid
                          ? 'Aucun élève inscrit dans cette classe.'
                          : 'Choisissez une classe et une évaluation pour afficher la grille.',
                }}
                paging={table}
            >
                <Table containerClassName={DATA_TABLE_CONTAINER}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <DataTableColumnHeader icon={Hash}>
                                    Matricule
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={User}>
                                    Élève
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={School}>
                                    Classe
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead>
                                <DataTableColumnHeader icon={ClipboardList}>
                                    Évaluation
                                </DataTableColumnHeader>
                            </TableHead>
                            <TableHead className="w-36">
                                <DataTableColumnHeader icon={PenLine}>
                                    Note /20
                                </DataTableColumnHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.pageRows.map((row) => (
                            <TableRow key={row.enrollmentId}>
                                <TableCell>
                                    <CodeBadge>{row.matricule}</CodeBadge>
                                </TableCell>
                                <TableCell>
                                    <PersonCell
                                        name={row.name}
                                        photoUrl={row.photoUrl}
                                    />
                                </TableCell>
                                <TableCell>
                                    {grid?.classroomName ?? '-'}
                                </TableCell>
                                <TableCell>
                                    {grid ? (
                                        <span className="flex items-center gap-2">
                                            <AssessmentTypeBadge
                                                type={grid.assessment.type}
                                            />
                                            <span className="min-w-0 truncate">
                                                {grid.assessment.name}
                                            </span>
                                        </span>
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>
                                <TableCell>
                                    {mode === 'entry' ? (
                                        <NoteInput
                                            className="h-8 w-24"
                                            value={scoreValue(
                                                row.enrollmentId,
                                                row.score,
                                            )}
                                            aria-label={`Note de ${row.name}`}
                                            disabled={!canEditScores}
                                            onValueChange={(value) =>
                                                setDrafts((current) => ({
                                                    ...current,
                                                    [row.enrollmentId]: value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className="hover:bg-muted h-8 min-w-24 rounded-[8px] border px-2.5 text-left text-[13px] disabled:pointer-events-none disabled:opacity-50"
                                            disabled={!canEditScores}
                                            onClick={() => {
                                                clearErrors();
                                                setControl({
                                                    enrollmentId:
                                                        row.enrollmentId,
                                                    name: row.name,
                                                    value:
                                                        row.score === null
                                                            ? ''
                                                            : String(row.score),
                                                });
                                            }}
                                        >
                                            {row.score === null
                                                ? '-'
                                                : formatNote(row.score)}
                                        </button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage>

            <Dialog
                open={control !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        clearErrors();
                        setControl(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Corriger la note</DialogTitle>
                        <DialogDescription>
                            {control
                                ? `${control.name} · note /20.`
                                : 'Note /20.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Field
                        id="controlScore"
                        label="Note"
                        required
                        error={errors.controlScore}
                    >
                        <NoteInput
                            id="controlScore"
                            value={control?.value ?? ''}
                            onValueChange={(value) => {
                                clearErrors('controlScore');
                                setControl((current) =>
                                    current ? { ...current, value } : current,
                                );
                            }}
                        />
                    </Field>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                clearErrors();
                                setControl(null);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                void confirmControl();
                            }}
                        >
                            {saving ? 'Enregistrement…' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
