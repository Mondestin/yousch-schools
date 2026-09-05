<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Term;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TermController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $query = Term::query()->orderBy('academic_year_id')->orderBy('position');

        if ($request->filled('academicYearId')) {
            $query->where('academic_year_id', $request->string('academicYearId'));
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

        $validated = $this->validatedTerm($request);

        $term = Term::query()->create([
            'id' => ResourceId::make('term'),
            'academic_year_id' => $validated['academicYearId'],
            'name' => $validated['name'],
            'position' => $validated['position'],
            'starts_on' => $validated['startsOn'],
            'ends_on' => $validated['endsOn'],
        ]);

        return response()->json(['data' => $term->toApiArray()], 201);
    }

    public function update(Request $request, string $term): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = Term::query()->findOrFail($term);
        $validated = $this->validatedTerm($request, $model);

        $model->update([
            'academic_year_id' => $validated['academicYearId'],
            'name' => $validated['name'],
            'position' => $validated['position'],
            'starts_on' => $validated['startsOn'],
            'ends_on' => $validated['endsOn'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $term): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        Term::query()->findOrFail($term)->delete();

        return response()->json(['message' => 'Trimestre supprimé.']);
    }

    /**
     * @return array{academicYearId: string, name: string, position: int, startsOn: string, endsOn: string}
     */
    private function validatedTerm(Request $request, ?Term $existing = null): array
    {
        $yearId = $request->input('academicYearId', $existing?->academic_year_id);

        return $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
            'name' => ['required', 'string', 'max:80'],
            'position' => [
                'required',
                'integer',
                Rule::in([1, 2, 3]),
                Rule::unique('terms', 'position')
                    ->where(fn ($query) => $query->where('academic_year_id', $yearId))
                    ->ignore($existing?->id),
            ],
            'startsOn' => ['required', 'date'],
            'endsOn' => ['required', 'date', 'after:startsOn'],
        ], [
            'academicYearId.required' => 'L’année scolaire est obligatoire.',
            'academicYearId.exists' => 'L’année scolaire est introuvable.',
            'name.required' => 'Le nom du trimestre est obligatoire.',
            'position.required' => 'La position du trimestre est obligatoire.',
            'position.unique' => 'Ce numéro de trimestre existe déjà pour l’année.',
            'startsOn.required' => 'La date de début est obligatoire.',
            'endsOn.required' => 'La date de fin est obligatoire.',
            'endsOn.after' => 'La date de fin doit être après la date de début.',
        ]);
    }
}
