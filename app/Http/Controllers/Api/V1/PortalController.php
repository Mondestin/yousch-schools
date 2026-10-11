<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AnnouncementAudience;
use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\Sanction;
use App\Models\Student;
use App\Models\User;
use App\Support\Assessment\MarkingWindowGate;
use App\Support\Auth\PortalAccess;
use App\Support\Portal\PortalStudentPresenter;
use App\Support\School\BulletinCalculator;
use App\Support\School\PaymentReceiptBuilder;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only mobile/portal API for élèves and parents.
 */
class PortalController extends Controller
{
    public function __construct(
        private readonly BulletinCalculator $bulletins,
        private readonly PaymentReceiptBuilder $receipts,
        private readonly PortalStudentPresenter $presenter,
    ) {}

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $students = PortalAccess::studentsFor($user);
        $schoolProfile = $this->presenter->schoolProfile();

        return response()->json([
            'data' => $user->toStaffApiArray(),
            'school' => CurrentSchool::get()?->toSharedArray(),
            'schoolProfile' => $schoolProfile,
            'theme' => $this->presenter->theme(),
            'students' => $students->map(fn (Student $student): array => $this->presenter->student($student))->values()->all(),
            'guardian' => $user->role === StaffRole::Parent
                ? PortalAccess::guardianFor($user)?->toApiArray()
                : null,
        ]);
    }

    public function students(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $students = PortalAccess::studentsFor($user);

        return response()->json([
            'data' => $students->map(fn (Student $student): array => $this->presenter->student($student))->values()->all(),
            'theme' => $this->presenter->theme(),
        ]);
    }

    public function showStudent(Request $request, string $student): JsonResponse
    {
        return $this->profile($request, $student);
    }

    /**
     * Full student profile: identity, card fields, school theme.
     */
    public function profile(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        return response()->json([
            'data' => $this->presenter->student($model),
            'theme' => $this->presenter->theme(),
            'schoolProfile' => $this->presenter->schoolProfile(),
        ]);
    }

    public function bulletin(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $validated = $request->validate([
            'termId' => ['required', 'string', 'exists:terms,id'],
        ], [
            'termId.required' => 'Le trimestre est obligatoire.',
        ]);

        if ($denied = MarkingWindowGate::assertBulletinsReleased($validated['termId'])) {
            return $denied;
        }

        if ($denied = MarkingWindowGate::assertStudentHasDevoirAndCompositionGrades(
            $model->id,
            $validated['termId'],
        )) {
            return $denied;
        }

        $fiche = $this->bulletins->fiche($model->id, $validated['termId']);

        if ($fiche === null) {
            return response()->json(['message' => 'Bulletin introuvable pour cet élève et ce trimestre.'], 404);
        }

        return response()->json(['data' => $fiche]);
    }

    /** Notes (grades). */
    public function notes(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $enrollmentId = $request->filled('enrollmentId')
            ? (string) $request->string('enrollmentId')
            : null;

        if ($enrollmentId !== null) {
            $ids = $model->enrollments->pluck('id');
            if (! $ids->contains($enrollmentId)) {
                return response()->json(['message' => 'Inscription introuvable.'], 404);
            }
        }

        return response()->json([
            'data' => $this->presenter->notes($model, $enrollmentId),
        ]);
    }

    public function grades(Request $request, string $student): JsonResponse
    {
        return $this->notes($request, $student);
    }

    public function payments(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $enrollmentIds = Enrollment::query()
            ->where('student_id', $model->id)
            ->pluck('id');

        $payments = Payment::query()
            ->whereIn('enrollment_id', $enrollmentIds)
            ->orderByDesc('month')
            ->get();

        return response()->json([
            'data' => $payments->map->toApiArray()->values()->all(),
        ]);
    }

    public function receipt(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $validated = $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
        ], [
            'academicYearId.required' => 'L’année scolaire est obligatoire.',
        ]);

        $receipt = $this->receipts->forStudent($model->id, $validated['academicYearId']);

        if ($receipt === null) {
            return response()->json(['message' => 'Reçu introuvable pour cet élève.'], 404);
        }

        return response()->json(['data' => $receipt]);
    }

    /** Présences (attendance). */
    public function presences(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $date = $request->filled('date') ? (string) $request->string('date') : null;

        return response()->json([
            'data' => $this->presenter->presences($model, $date),
        ]);
    }

    public function attendance(Request $request, string $student): JsonResponse
    {
        return $this->presences($request, $student);
    }

    public function files(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $model->loadMissing('dossierFiles');

        return response()->json([
            'data' => $model->dossierFiles->map->toApiArray()->values()->all(),
        ]);
    }

    public function sanctions(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        $sanctions = Sanction::query()
            ->where('student_id', $model->id)
            ->orderByDesc('date')
            ->get();

        return response()->json([
            'data' => $sanctions->map->toApiArray()->values()->all(),
        ]);
    }

    /** Emploi du temps / planning. */
    public function planning(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $model = PortalAccess::requireStudent($user, $student);

        if ($model instanceof JsonResponse) {
            return $model;
        }

        return response()->json($this->presenter->planning($model));
    }

    public function timetable(Request $request, string $student): JsonResponse
    {
        return $this->planning($request, $student);
    }

    public function announcements(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = PortalAccess::denyUnlessPortal($user)) {
            return $denied;
        }

        $audiences = match ($user->role) {
            StaffRole::Eleve => [AnnouncementAudience::Eleves->value, AnnouncementAudience::Tous->value],
            StaffRole::Parent => [AnnouncementAudience::Parents->value, AnnouncementAudience::Tous->value],
            default => [AnnouncementAudience::Tous->value],
        };

        $announcements = Announcement::query()
            ->whereIn('audience', $audiences)
            ->orderByDesc('published_on')
            ->get();

        return response()->json([
            'data' => $announcements->map->toApiArray()->values()->all(),
        ]);
    }
}
