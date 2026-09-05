<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Cycle;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Api\V1\Concerns\ManagesDossierUploads;
use App\Http\Controllers\Controller;
use App\Models\Subject;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SubjectController extends Controller
{
    use EnsuresStaffAbility;
    use ManagesDossierUploads;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'subjects')) {
            return $denied;
        }

        $query = Subject::query()->with('files')->orderBy('code');

        if ($request->filled('cycle')) {
            $query->where('cycle', $request->string('cycle'));
        }

        if ($request->filled('gradeLevelId')) {
            $query->where('grade_level_id', $request->string('gradeLevelId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $subject): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'subjects')) {
            return $denied;
        }

        $model = Subject::query()->with('files')->findOrFail($subject);

        return response()->json(['data' => $model->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'subjects')) {
            return $denied;
        }

        $validated = $this->validatedSubject($request);

        $subject = Subject::query()->create([
            'id' => ResourceId::make('su'),
            'code' => $validated['code'],
            'name' => $validated['name'],
            'textbook' => $validated['textbook'] ?? null,
            'coefficient' => $validated['coefficient'] ?? null,
            'cycle' => $validated['cycle'],
            'grade_level_id' => $validated['gradeLevelId'],
            'track_id' => $validated['trackId'] ?? null,
        ]);

        $this->storeDossierFiles($subject, $request->file('files'), 'subjects/lessons');

        return response()->json(['data' => $subject->load('files')->toApiArray()], 201);
    }

    public function update(Request $request, string $subject): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'subjects')) {
            return $denied;
        }

        $model = Subject::query()->findOrFail($subject);
        $validated = $this->validatedSubject($request, $model);

        $model->update([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'textbook' => $validated['textbook'] ?? null,
            'coefficient' => $validated['coefficient'] ?? null,
            'cycle' => $validated['cycle'],
            'grade_level_id' => $validated['gradeLevelId'],
            'track_id' => $validated['trackId'] ?? null,
        ]);

        $this->storeDossierFiles($model, $request->file('files'), 'subjects/lessons');

        return response()->json(['data' => $model->fresh()->load('files')->toApiArray()]);
    }

    public function destroy(Request $request, string $subject): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'subjects')) {
            return $denied;
        }

        $model = Subject::query()->findOrFail($subject);

        if ($model->teacherAssignments()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une matière utilisée dans des affectations.',
            ], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Matière supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedSubject(Request $request, ?Subject $existing = null): array
    {
        $cycleValue = $request->input('cycle', $existing?->cycle?->value);
        $gradeLevelId = $request->input('gradeLevelId', $existing?->grade_level_id);
        $trackId = $request->input('trackId', $existing?->track_id);

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:40',
                Rule::unique('subjects', 'code')
                    ->where(fn ($query) => $query
                        ->where('cycle', $cycleValue)
                        ->where('grade_level_id', $gradeLevelId)
                        ->where('track_id', $trackId))
                    ->ignore($existing?->id),
            ],
            'name' => ['required', 'string', 'max:180'],
            'textbook' => ['nullable', 'string', 'max:255'],
            'coefficient' => ['nullable', 'numeric', 'min:0.5', 'max:20'],
            'cycle' => ['required', 'string', Rule::enum(Cycle::class)],
            'gradeLevelId' => ['required', 'string', 'exists:grade_levels,id'],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:8192'],
        ], [
            'code.required' => 'Le code de la matière est obligatoire.',
            'code.unique' => 'Ce code de matière existe déjà pour ce niveau.',
            'name.required' => 'Le nom de la matière est obligatoire.',
            'cycle.required' => 'Le cycle est obligatoire.',
            'gradeLevelId.required' => 'Le niveau est obligatoire.',
        ]);

        $cycle = Cycle::from($validated['cycle']);

        if ($cycle->needsCoefficient() && ($validated['coefficient'] ?? null) === null) {
            throw ValidationException::withMessages([
                'coefficient' => ['Le coefficient est obligatoire à partir du collège.'],
            ]);
        }

        if (! $cycle->needsCoefficient()) {
            $validated['coefficient'] = null;
        }

        if ($cycle->isLycee() && empty($validated['trackId'])) {
            throw ValidationException::withMessages([
                'trackId' => ['Choisissez une série pour le lycée.'],
            ]);
        }

        if (! $cycle->isLycee()) {
            $validated['trackId'] = null;
        }

        return $validated;
    }
}
