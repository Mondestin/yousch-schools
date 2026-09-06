<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Api\V1\Concerns\ManagesDossierUploads;
use App\Http\Controllers\Controller;
use App\Models\AttendanceMark;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Auth\StaffAssignmentScope;
use App\Support\Storage\SchoolStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AttendanceMarkController extends Controller
{
    use EnsuresStaffAbility;
    use ManagesDossierUploads;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'attendance')) {
            return $denied;
        }

        $query = AttendanceMark::query()->orderBy('date')->orderBy('enrollment_id');

        if ($request->filled('date')) {
            $query->whereDate('date', $request->string('date'));
        }

        if ($request->filled('classroomId')) {
            $enrollmentIds = Enrollment::query()
                ->where('classroom_id', $request->string('classroomId'))
                ->pluck('id');
            $query->whereIn('enrollment_id', $enrollmentIds);
        }

        if ($request->filled('enrollmentId')) {
            $query->where('enrollment_id', $request->string('enrollmentId'));
        }

        if ($request->filled('slotId')) {
            $query->where('slot_id', $request->string('slotId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    /**
     * Bulk upsert marks for a class × date (and optional slot).
     */
    public function upsert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'attendance')) {
            return $denied;
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'slotId' => ['nullable', 'string', 'exists:timetable_slots,id'],
            'marks' => ['required', 'array', 'min:1'],
            'marks.*.enrollmentId' => ['required', 'string', 'exists:enrollments,id'],
            'marks.*.status' => ['required', 'string', Rule::enum(AttendanceStatus::class)],
            'marks.*.periodId' => ['nullable', 'string', 'max:40'],
            'marks.*.subjectId' => ['nullable', 'string', 'exists:subjects,id'],
            'marks.*.note' => ['nullable', 'string'],
            'marks.*.removeDocument' => ['sometimes', 'boolean'],
            'marks.*.document' => ['nullable', 'file', 'max:5120'],
        ], [
            'date.required' => 'La date est obligatoire.',
            'classroomId.required' => 'La classe est obligatoire.',
            'marks.required' => 'Les présences sont obligatoires.',
            'marks.*.enrollmentId.required' => 'L’inscription est obligatoire.',
            'marks.*.status.required' => 'Le statut de présence est obligatoire.',
        ]);

        if ($denied = StaffAssignmentScope::denyUnlessCanTeachClassroom($user, $validated['classroomId'])) {
            return $denied;
        }

        $classroomEnrollmentIds = Enrollment::query()
            ->where('classroom_id', $validated['classroomId'])
            ->pluck('id')
            ->all();

        $saved = DB::transaction(function () use ($request, $validated, $classroomEnrollmentIds): array {
            $rows = [];

            foreach ($validated['marks'] as $index => $mark) {
                if (! in_array($mark['enrollmentId'], $classroomEnrollmentIds, true)) {
                    throw ValidationException::withMessages([
                        "marks.{$index}.enrollmentId" => ['Cette inscription n’appartient pas à la classe.'],
                    ]);
                }

                $status = AttendanceStatus::from($mark['status']);

                if ($status === AttendanceStatus::Excuse && blank($mark['note'] ?? null)) {
                    throw ValidationException::withMessages([
                        "marks.{$index}.note" => ['Le motif est obligatoire pour une absence excusée.'],
                    ]);
                }

                $existing = $this->findExistingMark(
                    $mark['enrollmentId'],
                    $validated['date'],
                    $validated['slotId'] ?? null,
                    $mark['periodId'] ?? null,
                );

                $documentUrl = $existing?->document_url;
                $documentName = $existing?->document_name;

                if (($mark['removeDocument'] ?? false) === true) {
                    $this->deleteStoredPublicUrl($documentUrl);
                    $documentUrl = null;
                    $documentName = null;
                }

                /** @var UploadedFile|null $document */
                $document = $request->file("marks.{$index}.document");

                if ($document instanceof UploadedFile) {
                    $this->deleteStoredPublicUrl($documentUrl);

                    try {
                        $documentUrl = SchoolStorage::store(
                            $document,
                            'attendance/excuses',
                        );
                    } catch (RuntimeException) {
                        throw ValidationException::withMessages([
                            "marks.{$index}.document" => ['Impossible d’enregistrer le justificatif.'],
                        ]);
                    }

                    $documentName = $document->getClientOriginalName();
                }

                $payload = [
                    'status' => $status->value,
                    'slot_id' => $validated['slotId'] ?? null,
                    'period_id' => $mark['periodId'] ?? null,
                    'subject_id' => $mark['subjectId'] ?? null,
                    'note' => $mark['note'] ?? null,
                    'document_url' => $documentUrl,
                    'document_name' => $documentName,
                ];

                if ($existing !== null) {
                    $existing->update($payload);
                    $rows[] = $existing->refresh();
                } else {
                    $rows[] = AttendanceMark::query()->create([
                        'id' => ResourceId::make('at'),
                        'enrollment_id' => $mark['enrollmentId'],
                        'date' => $validated['date'],
                        ...$payload,
                    ]);
                }
            }

            return $rows;
        });

        return response()->json([
            'data' => collect($saved)
                ->map(static fn (AttendanceMark $mark): array => $mark->toApiArray())
                ->values()
                ->all(),
        ]);
    }

    public function destroy(Request $request, string $attendanceMark): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'attendance')) {
            return $denied;
        }

        $model = AttendanceMark::query()->findOrFail($attendanceMark);
        $this->deleteStoredPublicUrl($model->document_url);
        $model->delete();

        return response()->json(['message' => 'Présence supprimée.']);
    }

    private function findExistingMark(
        string $enrollmentId,
        string $date,
        ?string $slotId,
        ?string $periodId,
    ): ?AttendanceMark {
        $query = AttendanceMark::query()
            ->where('enrollment_id', $enrollmentId)
            ->whereDate('date', $date);

        if ($slotId !== null && $slotId !== '') {
            return $query->where('slot_id', $slotId)->first();
        }

        if ($periodId !== null && $periodId !== '') {
            return $query->whereNull('slot_id')->where('period_id', $periodId)->first();
        }

        return $query->whereNull('slot_id')->whereNull('period_id')->first();
    }
}
