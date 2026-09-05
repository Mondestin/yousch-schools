<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Cycle;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Track;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TrackController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $query = Track::query()->orderBy('code');

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

        $validated = $this->validatedTrack($request);

        $track = Track::query()->create([
            'id' => ResourceId::make('tr'),
            'cycle' => $validated['cycle'],
            'code' => $validated['code'],
            'name' => $validated['name'],
        ]);

        return response()->json(['data' => $track->toApiArray()], 201);
    }

    public function update(Request $request, string $track): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = Track::query()->findOrFail($track);
        $validated = $this->validatedTrack($request, $model);

        $model->update([
            'cycle' => $validated['cycle'],
            'code' => $validated['code'],
            'name' => $validated['name'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $track): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = Track::query()->findOrFail($track);

        if ($model->classrooms()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une série utilisée par des classes.',
            ], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Série supprimée.']);
    }

    /**
     * @return array{cycle: string, code: string, name: string}
     */
    private function validatedTrack(Request $request, ?Track $existing = null): array
    {
        $cycle = $request->input('cycle', $existing?->cycle?->value);

        $validated = $request->validate([
            'cycle' => [
                'required',
                'string',
                Rule::in([Cycle::LyceeGeneral->value, Cycle::LyceeTechnique->value]),
            ],
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('tracks', 'code')
                    ->where(fn ($query) => $query->where('cycle', $cycle))
                    ->ignore($existing?->id),
            ],
            'name' => ['required', 'string', 'max:80'],
        ], [
            'cycle.required' => 'Le cycle est obligatoire.',
            'cycle.in' => 'La série n’est disponible que pour le lycée.',
            'code.required' => 'Le code de la série est obligatoire.',
            'code.unique' => 'Ce code de série existe déjà pour ce cycle.',
            'name.required' => 'Le nom de la série est obligatoire.',
        ]);

        $cycleEnum = Cycle::tryFrom($validated['cycle']);

        if ($cycleEnum === null || ! $cycleEnum->isLycee()) {
            throw ValidationException::withMessages([
                'cycle' => ['La série n’est disponible que pour le lycée.'],
            ]);
        }

        return $validated;
    }
}
