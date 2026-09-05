<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnrollmentStatus;
use App\Enums\ReenrollmentStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Api\V1\Concerns\ManagesDossierUploads;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Reenrollment;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReenrollmentController extends Controller
{
    use EnsuresStaffAbility;
    use ManagesDossierUploads;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $query = Reenrollment::query()->with('files')->orderByDesc('submitted_on');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('academicYearId')) {
            $query->where('academic_year_id', $request->string('academicYearId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $reenrollment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Reenrollment::query()->with('files')->findOrFail($reenrollment);

        return response()->json(['data' => $model->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $this->validatedReenrollment($request);
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

        $reenrollment = Reenrollment::query()->create([
            'id' => ResourceId::make('re'),
            'academic_year_id' => $validated['academicYearId'],
            'student_id' => $validated['studentId'],
            'previous_class' => $validated['previousClass'],
            'classroom_id' => $validated['classroomId'],
            'track_id' => $validated['trackId'] ?? $classroom->track_id,
            'submitted_on' => $validated['submittedOn'] ?? now()->toDateString(),
            'status' => ReenrollmentStatus::Demandee->value,
            'notes' => $validated['notes'] ?? null,
        ]);

        $this->storeDossierFiles($reenrollment, $request->file('files'), 'reenrollments/dossiers');

        return response()->json(['data' => $reenrollment->load('files')->toApiArray()], 201);
    }

    public function update(Request $request, string $reenrollment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Reenrollment::query()->findOrFail($reenrollment);

        if (in_array($model->status, [ReenrollmentStatus::Validee, ReenrollmentStatus::Refusee], true)) {
            return response()->json(['message' => 'Cette réinscription ne peut plus être modifiée.'], 422);
        }

        $validated = $this->validatedReenrollment($request, $model);
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

        $model->update([
            'academic_year_id' => $validated['academicYearId'],
            'student_id' => $validated['studentId'],
            'previous_class' => $validated['previousClass'],
            'classroom_id' => $validated['classroomId'],
            'track_id' => $validated['trackId'] ?? $classroom->track_id,
            'submitted_on' => $validated['submittedOn'] ?? $model->submitted_on,
            'notes' => $validated['notes'] ?? null,
        ]);

        $this->storeDossierFiles($model, $request->file('files'), 'reenrollments/dossiers');

        return response()->json(['data' => $model->fresh()->load('files')->toApiArray()]);
    }

    public function updateStatus(Request $request, string $reenrollment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Reenrollment::query()->with('files')->findOrFail($reenrollment);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::enum(ReenrollmentStatus::class)],
        ], [
            'status.required' => 'Le statut est obligatoire.',
        ]);

        $next = ReenrollmentStatus::from($validated['status']);
        $this->assertTransition($model->status, $next);

        if ($next === ReenrollmentStatus::Validee) {
            return response()->json([
                'data' => $this->validateReenrollment($model)->load('files')->toApiArray(),
            ]);
        }

        $model->update(['status' => $next->value]);

        return response()->json(['data' => $model->fresh()->load('files')->toApiArray()]);
    }

    public function destroy(Request $request, string $reenrollment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Reenrollment::query()->findOrFail($reenrollment);

        if ($model->status === ReenrollmentStatus::Validee) {
            return response()->json(['message' => 'Impossible de supprimer une réinscription validée.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Réinscription supprimée.']);
    }

    private function validateReenrollment(Reenrollment $reenrollment): Reenrollment
    {
        return DB::transaction(function () use ($reenrollment): Reenrollment {
            $enrollment = Enrollment::query()
                ->where('student_id', $reenrollment->student_id)
                ->where('academic_year_id', $reenrollment->academic_year_id)
                ->first();

            if ($enrollment !== null) {
                $enrollment->update([
                    'classroom_id' => $reenrollment->classroom_id,
                    'track_id' => $reenrollment->track_id,
                    'status' => EnrollmentStatus::Inscrit->value,
                ]);
            } else {
                Enrollment::query()->create([
                    'id' => ResourceId::make('en'),
                    'student_id' => $reenrollment->student_id,
                    'classroom_id' => $reenrollment->classroom_id,
                    'academic_year_id' => $reenrollment->academic_year_id,
                    'track_id' => $reenrollment->track_id,
                    'status' => EnrollmentStatus::Inscrit->value,
                ]);
            }

            $reenrollment->update(['status' => ReenrollmentStatus::Validee->value]);

            return $reenrollment->fresh();
        });
    }

    private function assertTransition(ReenrollmentStatus $current, ReenrollmentStatus $next): void
    {
        if ($current === $next) {
            return;
        }

        $allowed = match ($current) {
            ReenrollmentStatus::Demandee => [ReenrollmentStatus::EnEtude, ReenrollmentStatus::Refusee, ReenrollmentStatus::Validee],
            ReenrollmentStatus::EnEtude => [ReenrollmentStatus::Validee, ReenrollmentStatus::Refusee],
            ReenrollmentStatus::Validee, ReenrollmentStatus::Refusee => [],
        };

        if (! in_array($next, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ['Transition de statut non autorisée.'],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedReenrollment(Request $request, ?Reenrollment $existing = null): array
    {
        $studentId = $request->input('studentId', $existing?->student_id);
        $yearId = $request->input('academicYearId', $existing?->academic_year_id);

        return $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'studentId' => [
                'required',
                'string',
                'exists:students,id',
                Rule::unique('reenrollments', 'student_id')
                    ->where(fn ($query) => $query->where('academic_year_id', $yearId))
                    ->ignore($existing?->id),
            ],
            'previousClass' => ['required', 'string', 'max:180'],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
            'submittedOn' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:8192'],
        ], [
            'studentId.required' => 'L’élève est obligatoire.',
            'studentId.unique' => 'Une réinscription existe déjà pour cet élève cette année.',
            'previousClass.required' => 'La classe précédente est obligatoire.',
            'classroomId.required' => 'La classe demandée est obligatoire.',
        ]);
    }

    private function assertLyceeTrack(Classroom $classroom, ?string $trackId): void
    {
        if ($classroom->cycle->isLycee() && ($trackId === null || $trackId === '') && $classroom->track_id === null) {
            throw ValidationException::withMessages([
                'trackId' => ['Choisissez une série pour le lycée.'],
            ]);
        }
    }
}
