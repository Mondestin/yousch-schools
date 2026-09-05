<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Gender;
use App\Enums\TeacherStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Api\V1\Concerns\ManagesDossierUploads;
use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeacherController extends Controller
{
    use EnsuresStaffAbility;
    use ManagesDossierUploads;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $query = Teacher::query()
            ->with('files')
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->filled('q')) {
            $needle = '%'.mb_strtolower((string) $request->string('q')).'%';
            $query->where(function ($builder) use ($needle): void {
                $builder
                    ->whereRaw('lower(code) like ?', [$needle])
                    ->orWhereRaw('lower(last_name) like ?', [$needle])
                    ->orWhereRaw('lower(first_name) like ?', [$needle]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $teacher): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $model = Teacher::query()
            ->with(['files', 'assignments'])
            ->findOrFail($teacher);

        $payload = $model->toApiArray();
        $payload['assignments'] = $model->assignments->map->toApiArray()->values()->all();

        return response()->json(['data' => $payload]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $validated = $this->validatedTeacher($request);

        $teacher = Teacher::query()->create([
            'id' => ResourceId::make('tc'),
            'code' => $validated['code'] ?? $this->nextTeacherCode(),
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'phone' => $validated['phone'],
            'gender' => $validated['gender'],
            'qualification' => $validated['qualification'],
            'hired_on' => $validated['hiredOn'],
            'born_on' => $validated['bornOn'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'position' => $validated['position'] ?? null,
            'city' => $validated['city'],
            'neighborhood' => $validated['neighborhood'],
            'marital_status' => $validated['maritalStatus'],
            'status' => $validated['status'] ?? TeacherStatus::Actif->value,
            'photo_url' => $this->storePhoto($request, 'teachers/photos'),
        ]);

        $this->storeDossierFiles($teacher, $request->file('files'), 'teachers/dossiers');

        return response()->json([
            'data' => $teacher->load('files')->toApiArray(),
        ], 201);
    }

    public function update(Request $request, string $teacher): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $model = Teacher::query()->findOrFail($teacher);
        $validated = $this->validatedTeacher($request, $model);

        $model->fill([
            'code' => $validated['code'] ?? $model->code,
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'phone' => $validated['phone'],
            'gender' => $validated['gender'],
            'qualification' => $validated['qualification'],
            'hired_on' => $validated['hiredOn'],
            'born_on' => $validated['bornOn'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'position' => $validated['position'] ?? null,
            'city' => $validated['city'],
            'neighborhood' => $validated['neighborhood'],
            'marital_status' => $validated['maritalStatus'],
            'status' => $validated['status'] ?? $model->status->value,
            'photo_url' => $this->storePhoto($request, 'teachers/photos', $model->photo_url),
        ])->save();

        $this->storeDossierFiles($model, $request->file('files'), 'teachers/dossiers');

        return response()->json([
            'data' => $model->fresh()->load('files')->toApiArray(),
        ]);
    }

    public function destroy(Request $request, string $teacher): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'teachers')) {
            return $denied;
        }

        $model = Teacher::query()->findOrFail($teacher);

        if ($model->assignments()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer un enseignant qui a des affectations.',
            ], 422);
        }

        $this->deleteStoredPublicUrl($model->photo_url);
        $model->delete();

        return response()->json(['message' => 'Enseignant supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedTeacher(Request $request, ?Teacher $existing = null): array
    {
        return $request->validate([
            'code' => [
                'sometimes',
                'string',
                'max:40',
                Rule::unique('teachers', 'code')->ignore($existing?->id),
            ],
            'firstName' => ['required', 'string', 'max:120'],
            'lastName' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:40'],
            'gender' => ['required', 'string', Rule::enum(Gender::class)],
            'qualification' => ['required', 'string', 'max:180'],
            'hiredOn' => ['required', 'date'],
            'bornOn' => ['nullable', 'date'],
            'email' => ['nullable', 'email', 'max:180'],
            'address' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:120'],
            'neighborhood' => ['required', 'string', 'max:120'],
            'maritalStatus' => ['required', 'string', 'max:40'],
            'status' => ['nullable', 'string', Rule::enum(TeacherStatus::class)],
            'photo' => ['nullable', 'image', 'max:4096'],
            'removePhoto' => ['sometimes', 'boolean'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:8192'],
        ], [
            'firstName.required' => 'Le prénom est obligatoire.',
            'lastName.required' => 'Le nom est obligatoire.',
            'phone.required' => 'Le téléphone est obligatoire.',
            'gender.required' => 'Le sexe est obligatoire.',
            'qualification.required' => 'La qualification est obligatoire.',
            'hiredOn.required' => 'La date d’embauche est obligatoire.',
            'city.required' => 'La ville est obligatoire.',
            'neighborhood.required' => 'Le quartier est obligatoire.',
            'maritalStatus.required' => 'La situation matrimoniale est obligatoire.',
            'code.unique' => 'Ce code enseignant est déjà utilisé.',
        ]);
    }

    private function nextTeacherCode(): string
    {
        $latest = Teacher::query()
            ->where('code', 'like', 'ENS-%')
            ->orderByDesc('code')
            ->value('code');

        $sequence = 1;

        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches) === 1) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return 'ENS-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }
}
