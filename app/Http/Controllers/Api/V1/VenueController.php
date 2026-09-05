<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\VenueKind;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Venue;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VenueController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $venues = Venue::query()
            ->orderBy('name')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return response()->json(['data' => $venues]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $validated = $this->validatedVenue($request);

        $venue = Venue::query()->create([
            'id' => ResourceId::make('vn'),
            'name' => $validated['name'],
            'kind' => $validated['kind'],
            'building' => $validated['building'] ?? null,
            'capacity' => $validated['capacity'],
            'available' => $validated['available'],
        ]);

        return response()->json(['data' => $venue->toApiArray()], 201);
    }

    public function update(Request $request, string $venue): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = Venue::query()->findOrFail($venue);
        $validated = $this->validatedVenue($request);

        $model->update([
            'name' => $validated['name'],
            'kind' => $validated['kind'],
            'building' => $validated['building'] ?? null,
            'capacity' => $validated['capacity'],
            'available' => $validated['available'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $venue): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        Venue::query()->findOrFail($venue)->delete();

        return response()->json(['message' => 'Salle supprimée.']);
    }

    /**
     * @return array{name: string, kind: string, building?: string|null, capacity: int, available: bool}
     */
    private function validatedVenue(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'kind' => ['required', 'string', Rule::enum(VenueKind::class)],
            'building' => ['nullable', 'string', 'max:120'],
            'capacity' => ['required', 'integer', 'min:1', 'max:500'],
            'available' => ['required', 'boolean'],
        ], [
            'name.required' => 'Le nom de la salle est obligatoire.',
            'kind.required' => 'Le type de salle est obligatoire.',
            'capacity.required' => 'La capacité est obligatoire.',
            'available.required' => 'La disponibilité est obligatoire.',
        ]);
    }
}
