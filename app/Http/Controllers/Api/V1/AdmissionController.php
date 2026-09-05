<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AdmissionStatus;
use App\Enums\Cycle;
use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Api\V1\Concerns\ManagesDossierUploads;
use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\School\MatriculeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdmissionController extends Controller
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

        $query = Admission::query()->with('files')->orderByDesc('submitted_on');

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

    public function show(Request $request, string $admission): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Admission::query()->with('files')->findOrFail($admission);

        return response()->json(['data' => $model->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $this->validatedAdmission($request);
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

        $admission = Admission::query()->create([
            'id' => ResourceId::make('ad'),
            'academic_year_id' => $validated['academicYearId'],
            'cycle' => $validated['cycle'],
            'classroom_id' => $validated['classroomId'],
            'track_id' => $validated['trackId'] ?? $classroom->track_id,
            'submitted_on' => $validated['submittedOn'] ?? now()->toDateString(),
            'status' => AdmissionStatus::Recue->value,
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'gender' => $validated['gender'],
            'born_on' => $validated['bornOn'],
            'city' => $validated['city'],
            'neighborhood' => $validated['neighborhood'],
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'guardian_last_name' => $validated['guardianLastName'],
            'guardian_first_name' => $validated['guardianFirstName'],
            'guardian_phone' => $validated['guardianPhone'],
            'guardian_relation' => $validated['guardianRelation'],
            'notes' => $validated['notes'] ?? null,
            'student_id' => null,
        ]);

        $this->storeDossierFiles($admission, $request->file('files'), 'admissions/dossiers');

        return response()->json(['data' => $admission->load('files')->toApiArray()], 201);
    }

    public function update(Request $request, string $admission): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Admission::query()->findOrFail($admission);

        if (in_array($model->status, [AdmissionStatus::Inscrit, AdmissionStatus::Refusee], true)) {
            return response()->json(['message' => 'Cette candidature ne peut plus être modifiée.'], 422);
        }

        $validated = $this->validatedAdmission($request);
        $classroom = Classroom::query()->findOrFail($validated['classroomId']);
        $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

        $model->update([
            'academic_year_id' => $validated['academicYearId'],
            'cycle' => $validated['cycle'],
            'classroom_id' => $validated['classroomId'],
            'track_id' => $validated['trackId'] ?? $classroom->track_id,
            'submitted_on' => $validated['submittedOn'] ?? $model->submitted_on,
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'gender' => $validated['gender'],
            'born_on' => $validated['bornOn'],
            'city' => $validated['city'],
            'neighborhood' => $validated['neighborhood'],
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'guardian_last_name' => $validated['guardianLastName'],
            'guardian_first_name' => $validated['guardianFirstName'],
            'guardian_phone' => $validated['guardianPhone'],
            'guardian_relation' => $validated['guardianRelation'],
            'notes' => $validated['notes'] ?? null,
        ]);

        $this->storeDossierFiles($model, $request->file('files'), 'admissions/dossiers');

        return response()->json(['data' => $model->fresh()->load('files')->toApiArray()]);
    }

    public function updateStatus(Request $request, string $admission): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Admission::query()->with('files')->findOrFail($admission);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::enum(AdmissionStatus::class)],
        ], [
            'status.required' => 'Le statut est obligatoire.',
        ]);

        $next = AdmissionStatus::from($validated['status']);
        $this->assertTransition($model->status, $next);

        if ($next === AdmissionStatus::Inscrit) {
            return response()->json([
                'data' => $this->enrollAdmission($model)->load('files')->toApiArray(),
            ]);
        }

        $model->update(['status' => $next->value]);

        return response()->json(['data' => $model->fresh()->load('files')->toApiArray()]);
    }

    public function destroy(Request $request, string $admission): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Admission::query()->findOrFail($admission);

        if ($model->status === AdmissionStatus::Inscrit) {
            return response()->json(['message' => 'Impossible de supprimer une candidature déjà inscrite.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Candidature supprimée.']);
    }

    private function enrollAdmission(Admission $admission): Admission
    {
        if ($admission->student_id !== null) {
            $admission->update(['status' => AdmissionStatus::Inscrit->value]);

            return $admission->fresh();
        }

        return DB::transaction(function () use ($admission): Admission {
            $student = Student::query()->create([
                'id' => ResourceId::make('st'),
                'matricule' => MatriculeGenerator::next(),
                'first_name' => $admission->first_name,
                'last_name' => $admission->last_name,
                'gender' => $admission->gender->value,
                'born_on' => $admission->born_on,
                'city' => $admission->city,
                'neighborhood' => $admission->neighborhood,
                'address' => $admission->address,
                'phone' => $admission->phone,
                'email' => null,
                'enrolled_on' => now()->toDateString(),
                'photo_url' => null,
            ]);

            $guardian = Guardian::query()->create([
                'id' => ResourceId::make('gu'),
                'first_name' => $admission->guardian_first_name,
                'last_name' => $admission->guardian_last_name,
                'phone' => $admission->guardian_phone,
                'profession' => 'Non renseigné',
            ]);

            $student->guardians()->attach($guardian->id, [
                'relation' => $admission->guardian_relation->value,
            ]);

            Enrollment::query()->create([
                'id' => ResourceId::make('en'),
                'student_id' => $student->id,
                'classroom_id' => $admission->classroom_id,
                'academic_year_id' => $admission->academic_year_id,
                'track_id' => $admission->track_id,
                'status' => EnrollmentStatus::Inscrit->value,
            ]);

            $this->copyDossierFiles($admission->loadMissing('files'), $student);

            $admission->update([
                'status' => AdmissionStatus::Inscrit->value,
                'student_id' => $student->id,
            ]);

            return $admission->fresh();
        });
    }

    private function assertTransition(AdmissionStatus $current, AdmissionStatus $next): void
    {
        if ($current === $next) {
            return;
        }

        $allowed = match ($current) {
            AdmissionStatus::Recue => [AdmissionStatus::EnEtude, AdmissionStatus::Refusee, AdmissionStatus::Acceptee],
            AdmissionStatus::EnEtude => [AdmissionStatus::Acceptee, AdmissionStatus::Refusee],
            AdmissionStatus::Acceptee => [AdmissionStatus::Inscrit, AdmissionStatus::Refusee],
            AdmissionStatus::Refusee, AdmissionStatus::Inscrit => [],
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
    private function validatedAdmission(Request $request): array
    {
        return $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'cycle' => ['required', 'string', Rule::enum(Cycle::class)],
            'classroomId' => ['required', 'string', 'exists:classrooms,id'],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
            'submittedOn' => ['nullable', 'date'],
            'firstName' => ['required', 'string', 'max:120'],
            'lastName' => ['required', 'string', 'max:120'],
            'gender' => ['required', 'string', Rule::enum(Gender::class)],
            'bornOn' => ['required', 'date'],
            'city' => ['required', 'string', 'max:120'],
            'neighborhood' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'guardianLastName' => ['required', 'string', 'max:120'],
            'guardianFirstName' => ['required', 'string', 'max:120'],
            'guardianPhone' => ['required', 'string', 'max:40'],
            'guardianRelation' => ['required', 'string', Rule::enum(GuardianRelation::class)],
            'notes' => ['nullable', 'string'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:8192'],
        ], [
            'firstName.required' => 'Le prénom est obligatoire.',
            'lastName.required' => 'Le nom est obligatoire.',
            'gender.required' => 'Le sexe est obligatoire.',
            'guardianPhone.required' => 'Le téléphone du tuteur est obligatoire.',
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
