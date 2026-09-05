<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Cycle;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ClassroomController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $query = Classroom::query()->orderBy('name');

        if ($request->filled('academicYearId')) {
            $query->where('academic_year_id', $request->string('academicYearId'));
        }

        if ($request->filled('cycle')) {
            $query->where('cycle', $request->string('cycle'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $validated = $this->validatedClassroom($request);

        $classroom = Classroom::query()->create([
            'id' => ResourceId::make('cr'),
            'academic_year_id' => $validated['academicYearId'],
            'cycle' => $validated['cycle'],
            'grade_level_id' => $validated['gradeLevelId'],
            'track_id' => $validated['trackId'] ?? null,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'section' => $validated['section'] ?? null,
            'capacity' => $validated['capacity'],
        ]);

        return response()->json(['data' => $classroom->toApiArray()], 201);
    }

    public function update(Request $request, string $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = Classroom::query()->findOrFail($classroom);
        $validated = $this->validatedClassroom($request, $model);

        $model->update([
            'academic_year_id' => $validated['academicYearId'],
            'cycle' => $validated['cycle'],
            'grade_level_id' => $validated['gradeLevelId'],
            'track_id' => $validated['trackId'] ?? null,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'section' => $validated['section'] ?? null,
            'capacity' => $validated['capacity'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = Classroom::query()->findOrFail($classroom);

        if ($model->enrollments()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une classe qui a des inscriptions.',
            ], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Classe supprimée.']);
    }

    /**
     * @return array{
     *     academicYearId: string,
     *     cycle: string,
     *     gradeLevelId: string,
     *     trackId?: string|null,
     *     code: string,
     *     name: string,
     *     section?: string|null,
     *     capacity: int
     * }
     */
    private function validatedClassroom(Request $request, ?Classroom $existing = null): array
    {
        $yearId = $request->input('academicYearId', $existing?->academic_year_id);
        $cycle = $request->input('cycle', $existing?->cycle?->value);

        $validated = $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'cycle' => ['required', 'string', Rule::enum(Cycle::class)],
            'gradeLevelId' => ['required', 'string', 'exists:grade_levels,id'],
            'trackId' => ['nullable', 'string', 'exists:tracks,id'],
            'code' => [
                'required',
                'string',
                'max:40',
                Rule::unique('classrooms', 'code')
                    ->where(fn ($query) => $query
                        ->where('academic_year_id', $yearId)
                        ->where('cycle', $cycle))
                    ->ignore($existing?->id),
            ],
            'name' => ['required', 'string', 'max:120'],
            'section' => ['nullable', 'string', 'max:40'],
            'capacity' => ['required', 'integer', 'min:1', 'max:200'],
        ], [
            'academicYearId.required' => 'L’année scolaire est obligatoire.',
            'cycle.required' => 'Le cycle est obligatoire.',
            'gradeLevelId.required' => 'Le niveau est obligatoire.',
            'code.required' => 'Le code de classe est obligatoire.',
            'code.unique' => 'Ce code de classe existe déjà pour l’année et le cycle.',
            'name.required' => 'Le nom de la classe est obligatoire.',
            'capacity.required' => 'La capacité est obligatoire.',
        ]);

        $cycleEnum = Cycle::tryFrom($validated['cycle']);

        if ($cycleEnum?->isLycee() && empty($validated['trackId'])) {
            throw ValidationException::withMessages([
                'trackId' => ['Choisissez une série pour le lycée.'],
            ]);
        }

        if ($cycleEnum && ! $cycleEnum->isLycee()) {
            $validated['trackId'] = null;
        }

        return $validated;
    }
}
