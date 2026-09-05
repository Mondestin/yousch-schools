<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GuardianController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        $query = Guardian::query()->orderBy('last_name')->orderBy('first_name');

        if ($request->filled('q')) {
            $needle = '%'.mb_strtolower((string) $request->string('q')).'%';
            $query->where(function ($builder) use ($needle): void {
                $builder
                    ->whereRaw('lower(last_name) like ?', [$needle])
                    ->orWhereRaw('lower(first_name) like ?', [$needle])
                    ->orWhereRaw('lower(phone) like ?', [$needle]);
            });
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $guardian): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        $model = Guardian::query()->with('students')->findOrFail($guardian);
        $payload = $model->toApiArray();
        $payload['students'] = $model->students->map(static function (Student $student): array {
            $row = $student->toApiArray();
            $row['relation'] = $student->pivot->relation;

            return $row;
        })->values()->all();

        return response()->json(['data' => $payload]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        $validated = $this->validatedGuardian($request);

        $guardian = Guardian::query()->create([
            'id' => ResourceId::make('gu'),
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'phone' => $validated['phone'],
            'profession' => $validated['profession'],
            'gender' => $validated['gender'] ?? null,
            'email' => $validated['email'] ?? null,
            'city' => $validated['city'] ?? null,
            'neighborhood' => $validated['neighborhood'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        return response()->json(['data' => $guardian->toApiArray()], 201);
    }

    public function update(Request $request, string $guardian): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        $model = Guardian::query()->findOrFail($guardian);
        $validated = $this->validatedGuardian($request);

        $model->update([
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'phone' => $validated['phone'],
            'profession' => $validated['profession'],
            'gender' => $validated['gender'] ?? null,
            'email' => $validated['email'] ?? null,
            'city' => $validated['city'] ?? null,
            'neighborhood' => $validated['neighborhood'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $guardian): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        Guardian::query()->findOrFail($guardian)->delete();

        return response()->json(['message' => 'Tuteur supprimé.']);
    }

    public function attachStudent(Request $request, string $guardian): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        $model = Guardian::query()->findOrFail($guardian);

        $validated = $request->validate([
            'studentId' => ['required', 'string', 'exists:students,id'],
            'relation' => ['required', 'string', Rule::enum(GuardianRelation::class)],
        ], [
            'studentId.required' => 'L’élève est obligatoire.',
            'relation.required' => 'Le lien de parenté est obligatoire.',
        ]);

        $this->assertSingleTuteur($validated['studentId'], $validated['relation'], $model->id);

        $model->students()->syncWithoutDetaching([
            $validated['studentId'] => ['relation' => $validated['relation']],
        ]);

        return $this->show($request, $guardian);
    }

    public function detachStudent(Request $request, string $guardian, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'guardians')) {
            return $denied;
        }

        $model = Guardian::query()->findOrFail($guardian);
        $model->students()->detach($student);

        return response()->json(['message' => 'Lien élève–tuteur retiré.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedGuardian(Request $request): array
    {
        return $request->validate([
            'firstName' => ['required', 'string', 'max:120'],
            'lastName' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:40'],
            'profession' => ['required', 'string', 'max:120'],
            'gender' => ['nullable', 'string', Rule::enum(Gender::class)],
            'email' => ['nullable', 'email', 'max:180'],
            'city' => ['nullable', 'string', 'max:120'],
            'neighborhood' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
        ], [
            'firstName.required' => 'Le prénom est obligatoire.',
            'lastName.required' => 'Le nom est obligatoire.',
            'phone.required' => 'Le téléphone est obligatoire.',
            'profession.required' => 'La profession est obligatoire.',
        ]);
    }

    private function assertSingleTuteur(string $studentId, string $relation, string $guardianId): void
    {
        if ($relation !== GuardianRelation::Tuteur->value) {
            return;
        }

        $exists = DB::table('student_guardian')
            ->where('student_id', $studentId)
            ->where('relation', GuardianRelation::Tuteur->value)
            ->where('guardian_id', '!=', $guardianId)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'relation' => ['Cet élève a déjà un tuteur principal.'],
            ]);
        }
    }
}
