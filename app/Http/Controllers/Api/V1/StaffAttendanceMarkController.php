<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AttendanceStatus;
use App\Enums\StaffRole;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\StaffAttendanceMark;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Attendance\AttendanceMarkingGate;
use App\Support\Auth\StaffAssignmentScope;
use App\Support\School\SchoolClock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffAttendanceMarkController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCanManageStaffAttendance($user)) {
            return $denied;
        }

        $query = StaffAttendanceMark::query()->orderBy('date')->orderBy('teacher_id');

        if ($request->filled('date')) {
            $query->whereDate('date', $request->string('date'));
        }

        if ($request->filled('teacherId')) {
            $query->where('teacher_id', $request->string('teacherId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function sessions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'attendance')) {
            return $denied;
        }

        $query = AttendanceSession::query()->orderBy('date')->orderBy('slot_id');

        if ($request->filled('date')) {
            $query->whereDate('date', $request->string('date'));
        }

        if ($request->filled('slotId')) {
            $query->where('slot_id', $request->string('slotId'));
        }

        if ($request->filled('teacherId')) {
            $query->where('teacher_id', $request->string('teacherId'));
        }

        if (StaffAssignmentScope::isEnseignant($user)) {
            $teacher = StaffAssignmentScope::teacherFor($user);

            if ($teacher === null) {
                return response()->json(['data' => []]);
            }

            $query->where('teacher_id', $teacher->id);
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    /**
     * Teacher signature to open a slot attendance session.
     */
    public function sign(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'attendance')) {
            return $denied;
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'slotId' => ['required', 'string', 'exists:timetable_slots,id'],
            'signatureData' => ['required', 'string', 'min:32'],
            'status' => ['nullable', 'string', Rule::enum(AttendanceStatus::class)],
            'teacherId' => ['nullable', 'string', 'exists:teachers,id'],
        ], [
            'date.required' => 'La date est obligatoire.',
            'slotId.required' => 'Le créneau est obligatoire.',
            'signatureData.required' => 'La signature est obligatoire.',
            'signatureData.min' => 'La signature est invalide.',
        ]);

        $slot = TimetableSlot::query()->findOrFail($validated['slotId']);
        $teacherId = $this->resolveTeacherIdForSign($user, $validated, $slot);

        if ($teacherId === null) {
            return response()->json([
                'message' => 'Aucun profil enseignant lié à votre compte.',
            ], 403);
        }

        if (! AttendanceMarkingGate::isPrivileged($user)) {
            if ($denied = AttendanceMarkingGate::assertTeacherCanMarkDuringSignedWindow(
                $user,
                $validated['date'],
                $validated['slotId'],
                requireSignature: false,
            )) {
                return $denied;
            }
        }

        $status = AttendanceStatus::from($validated['status'] ?? AttendanceStatus::Present->value);

        $session = AttendanceSession::query()
            ->where('teacher_id', $teacherId)
            ->whereDate('date', $validated['date'])
            ->where('slot_id', $validated['slotId'])
            ->first();

        $payload = [
            'status' => $status->value,
            'signature_data' => $validated['signatureData'],
            'signed_at' => SchoolClock::now(),
        ];

        if ($session !== null) {
            $session->update($payload);
            $session = $session->fresh();
        } else {
            $session = AttendanceSession::query()->create([
                'id' => ResourceId::make('ats'),
                'teacher_id' => $teacherId,
                'date' => $validated['date'],
                'slot_id' => $validated['slotId'],
                ...$payload,
            ]);
        }

        return response()->json(['data' => $session->toApiArray()]);
    }

    /**
     * Bulk upsert marks for teachers × date.
     */
    public function upsert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCanManageStaffAttendance($user)) {
            return $denied;
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'marks' => ['required', 'array', 'min:1'],
            'marks.*.teacherId' => ['required', 'string', 'exists:teachers,id'],
            'marks.*.status' => ['required', 'string', Rule::enum(AttendanceStatus::class)],
            'marks.*.note' => ['nullable', 'string'],
        ], [
            'date.required' => 'La date est obligatoire.',
            'marks.required' => 'Les présences sont obligatoires.',
            'marks.*.teacherId.required' => 'L’enseignant est obligatoire.',
            'marks.*.status.required' => 'Le statut de présence est obligatoire.',
        ]);

        $teacherIds = Teacher::query()
            ->whereIn('id', collect($validated['marks'])->pluck('teacherId')->all())
            ->pluck('id')
            ->all();

        $saved = DB::transaction(function () use ($validated, $teacherIds): array {
            $rows = [];

            foreach ($validated['marks'] as $index => $mark) {
                if (! in_array($mark['teacherId'], $teacherIds, true)) {
                    throw ValidationException::withMessages([
                        "marks.{$index}.teacherId" => ['Cet enseignant est introuvable.'],
                    ]);
                }

                $status = AttendanceStatus::from($mark['status']);

                if ($status === AttendanceStatus::Excuse && blank($mark['note'] ?? null)) {
                    throw ValidationException::withMessages([
                        "marks.{$index}.note" => ['Le motif est obligatoire pour une absence excusée.'],
                    ]);
                }

                $existing = StaffAttendanceMark::query()
                    ->where('teacher_id', $mark['teacherId'])
                    ->whereDate('date', $validated['date'])
                    ->first();

                $payload = [
                    'status' => $status->value,
                    'note' => $mark['note'] ?? null,
                ];

                if ($existing !== null) {
                    $existing->update($payload);
                    $rows[] = $existing->refresh();
                } else {
                    $rows[] = StaffAttendanceMark::query()->create([
                        'id' => ResourceId::make('sat'),
                        'teacher_id' => $mark['teacherId'],
                        'date' => $validated['date'],
                        ...$payload,
                    ]);
                }
            }

            return $rows;
        });

        return response()->json([
            'data' => collect($saved)
                ->map(static fn (StaffAttendanceMark $mark): array => $mark->toApiArray())
                ->values()
                ->all(),
        ]);
    }

    /**
     * @param  array{date: string, slotId: string, signatureData: string, status?: string, teacherId?: string}  $validated
     */
    private function resolveTeacherIdForSign(User $user, array $validated, TimetableSlot $slot): ?string
    {
        if (StaffAssignmentScope::isEnseignant($user)) {
            return StaffAssignmentScope::teacherFor($user)?->id;
        }

        if (AttendanceMarkingGate::isPrivileged($user)) {
            return $validated['teacherId'] ?? $slot->teacher_id;
        }

        return null;
    }

    private function denyUnlessCanManageStaffAttendance(User $user): ?JsonResponse
    {
        if ($denied = $this->denyUnlessCan($user, 'attendance')) {
            return $denied;
        }

        if (! in_array($user->role, [StaffRole::Admin, StaffRole::Directeur], true)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return null;
    }
}
