<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Api\V1\Concerns\ManagesDossierUploads;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\School\MatriculeGenerator;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
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

        $query = Student::query()
            ->with(['dossierFiles', 'enrollments'])
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->filled('q')) {
            $needle = '%'.mb_strtolower((string) $request->string('q')).'%';
            $query->where(function ($builder) use ($needle): void {
                $builder
                    ->whereRaw('lower(matricule) like ?', [$needle])
                    ->orWhereRaw('lower(last_name) like ?', [$needle])
                    ->orWhereRaw('lower(first_name) like ?', [$needle]);
            });
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Student::query()
            ->with(['dossierFiles', 'enrollments', 'guardians'])
            ->findOrFail($student);

        $payload = $model->toApiArray();
        $payload['enrollments'] = $model->enrollments->map->toApiArray()->values()->all();
        $payload['guardians'] = $model->guardians->map(static function (Guardian $guardian): array {
            $row = $guardian->toApiArray();
            $pivot = $guardian->getRelation('pivot');
            $row['relation'] = $pivot instanceof Pivot
                ? $pivot->getAttribute('relation')
                : null;

            return $row;
        })->values()->all();

        return response()->json(['data' => $payload]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $this->validatedStudent($request);

        $student = DB::transaction(function () use ($request, $validated): Student {
            $student = Student::query()->create([
                'id' => ResourceId::make('st'),
                'matricule' => $validated['matricule'] ?? MatriculeGenerator::next(),
                'first_name' => $validated['firstName'],
                'last_name' => $validated['lastName'],
                'gender' => $validated['gender'],
                'born_on' => $validated['bornOn'],
                'city' => $validated['city'],
                'neighborhood' => $validated['neighborhood'],
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'enrolled_on' => $validated['enrolledOn'] ?? now()->toDateString(),
                'photo_url' => $this->storePhoto($request, 'students/photos'),
            ]);

            $this->storeDossierFiles($student, $request->file('files'), 'students/dossiers');

            if (! empty($validated['classroomId'])) {
                $classroom = Classroom::query()->findOrFail($validated['classroomId']);
                $this->assertLyceeTrack($classroom, $validated['trackId'] ?? null);

                Enrollment::query()->create([
                    'id' => ResourceId::make('en'),
                    'student_id' => $student->id,
                    'classroom_id' => $classroom->id,
                    'academic_year_id' => $validated['academicYearId'] ?? $classroom->academic_year_id,
                    'track_id' => $validated['trackId'] ?? $classroom->track_id,
                    'status' => EnrollmentStatus::Inscrit->value,
                ]);
            }

            if (! empty($validated['guardianFirstName']) && ! empty($validated['guardianLastName'])) {
                $guardian = Guardian::query()->create([
                    'id' => ResourceId::make('gu'),
                    'first_name' => $validated['guardianFirstName'],
                    'last_name' => $validated['guardianLastName'],
                    'phone' => $validated['guardianPhone'] ?? '',
                    'profession' => $validated['guardianProfession'] ?? 'Non renseigné',
                    'gender' => $validated['guardianGender'] ?? null,
                ]);

                $student->guardians()->attach($guardian->id, [
                    'relation' => $validated['guardianRelation'] ?? GuardianRelation::Tuteur->value,
                ]);
            }

            return $student->load(['dossierFiles', 'enrollments', 'guardians']);
        });

        return response()->json(['data' => $this->studentPayload($student)], 201);
    }

    public function update(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Student::query()->findOrFail($student);
        $validated = $this->validatedStudent($request, $model);

        $model->fill([
            'matricule' => $validated['matricule'] ?? $model->matricule,
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'gender' => $validated['gender'],
            'born_on' => $validated['bornOn'],
            'city' => $validated['city'],
            'neighborhood' => $validated['neighborhood'],
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'enrolled_on' => $validated['enrolledOn'] ?? $model->enrolled_on,
            'photo_url' => $this->storePhoto($request, 'students/photos', $model->photo_url),
        ])->save();

        $this->storeDossierFiles($model, $request->file('files'), 'students/dossiers');

        return response()->json([
            'data' => $this->studentPayload($model->fresh()->load(['dossierFiles', 'enrollments', 'guardians'])),
        ]);
    }

    public function destroy(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Student::query()->findOrFail($student);
        $this->deleteStoredPublicUrl($model->photo_url);
        $model->delete();

        return response()->json(['message' => 'Élève supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function studentPayload(Student $student): array
    {
        $payload = $student->toApiArray();
        $payload['enrollments'] = $student->enrollments->map->toApiArray()->values()->all();
        $payload['guardians'] = $student->guardians->map(static function (Guardian $guardian): array {
            $row = $guardian->toApiArray();
            $pivot = $guardian->getRelation('pivot');
            $row['relation'] = $pivot instanceof Pivot
                ? $pivot->getAttribute('relation')
                : null;

            return $row;
        })->values()->all();

        return $payload;
    }

    /**
     * @return array{
     *     matricule?: string,
     *     firstName: string,
     *     lastName: string,
     *     gender: string,
     *     bornOn: string,
     *     city: string,
     *     neighborhood: string,
     *     address?: string|null,
     *     phone?: string|null,
     *     email?: string|null,
     *     enrolledOn?: string|null,
     *     classroomId?: string|null,
     *     academicYearId?: string|null,
     *     trackId?: string|null,
     *     guardianFirstName?: string|null,
     *     guardianLastName?: string|null,
     *     guardianPhone?: string|null,
     *     guardianProfession?: string|null,
     *     guardianGender?: string|null,
     *     guardianRelation?: string|null,
     *     photo?: mixed,
     *     removePhoto?: bool,
     *     files?: list<UploadedFile>|null
     * }
     */
    private function validatedStudent(Request $request, ?Student $existing = null): array
    {
        return $request->validate([
            'matricule' => [
                'sometimes',
                'string',
                'max:40',
                Rule::unique('students', 'matricule')->ignore($existing?->id),
            ],
            'firstName' => ['required', 'string', 'max:120'],
            'lastName' => ['required', 'string', 'max:120'],
            'gender' => ['required', 'string', Rule::enum(Gender::class)],
            'bornOn' => ['required', 'date'],
            'city' => ['required', 'string', 'max:120'],
            'neighborhood' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:180'],
            'enrolledOn' => ['nullable', 'date'],
            'classroomId' => ['nullable', 'string', 'exists:classrooms,id'],
            'academicYearId' => ['nullable', 'string', 'exists:academic_years,id'],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
            'guardianFirstName' => ['nullable', 'string', 'max:120'],
            'guardianLastName' => ['nullable', 'string', 'max:120'],
            'guardianPhone' => ['nullable', 'string', 'max:40'],
            'guardianProfession' => ['nullable', 'string', 'max:120'],
            'guardianGender' => ['nullable', 'string', Rule::enum(Gender::class)],
            'guardianRelation' => ['nullable', 'string', Rule::enum(GuardianRelation::class)],
            'photo' => ['nullable', 'image', 'max:4096'],
            'removePhoto' => ['sometimes', 'boolean'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:8192'],
        ], [
            'firstName.required' => 'Le prénom est obligatoire.',
            'lastName.required' => 'Le nom est obligatoire.',
            'gender.required' => 'Le sexe est obligatoire.',
            'bornOn.required' => 'La date de naissance est obligatoire.',
            'city.required' => 'La ville est obligatoire.',
            'neighborhood.required' => 'Le quartier est obligatoire.',
            'matricule.unique' => 'Ce matricule est déjà utilisé.',
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
