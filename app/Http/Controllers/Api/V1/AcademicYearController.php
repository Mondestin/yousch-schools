<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Term;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicYearController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $years = AcademicYear::query()
            ->orderByDesc('starts_on')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return response()->json(['data' => $years]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $validated = $request->validate([
            'startYear' => ['required', 'integer', 'min:2000', 'max:2100'],
            'isCurrent' => ['sometimes', 'boolean'],
            'withTerms' => ['sometimes', 'boolean'],
        ], [
            'startYear.required' => 'L’année de début est obligatoire.',
            'startYear.integer' => 'L’année de début doit être un nombre.',
        ]);

        $startYear = (int) $validated['startYear'];
        $id = 'year-'.$startYear;

        if (AcademicYear::query()->whereKey($id)->exists()) {
            return response()->json([
                'message' => 'Cette année scolaire existe déjà.',
                'errors' => ['startYear' => ['Cette année scolaire existe déjà.']],
            ], 422);
        }

        $nextYear = $startYear + 1;
        $isCurrent = (bool) ($validated['isCurrent'] ?? false);
        $withTerms = (bool) ($validated['withTerms'] ?? true);

        $year = DB::transaction(function () use ($id, $startYear, $nextYear, $isCurrent, $withTerms): AcademicYear {
            if ($isCurrent) {
                AcademicYear::query()->where('is_current', true)->update(['is_current' => false]);
            }

            $year = AcademicYear::query()->create([
                'id' => $id,
                'label' => $startYear.'-'.$nextYear,
                'starts_on' => sprintf('%d-09-01', $startYear),
                'ends_on' => sprintf('%d-07-15', $nextYear),
                'is_current' => $isCurrent,
            ]);

            if ($withTerms) {
                Term::query()->create([
                    'id' => "term-{$startYear}-1",
                    'academic_year_id' => $id,
                    'name' => '1er trimestre',
                    'position' => 1,
                    'starts_on' => sprintf('%d-09-01', $startYear),
                    'ends_on' => sprintf('%d-12-18', $startYear),
                ]);
                Term::query()->create([
                    'id' => "term-{$startYear}-2",
                    'academic_year_id' => $id,
                    'name' => '2e trimestre',
                    'position' => 2,
                    'starts_on' => sprintf('%d-01-05', $nextYear),
                    'ends_on' => sprintf('%d-03-31', $nextYear),
                ]);
                Term::query()->create([
                    'id' => "term-{$startYear}-3",
                    'academic_year_id' => $id,
                    'name' => '3e trimestre',
                    'position' => 3,
                    'starts_on' => sprintf('%d-04-12', $nextYear),
                    'ends_on' => sprintf('%d-07-15', $nextYear),
                ]);
            }

            return $year;
        });

        $payload = $year->toApiArray();
        $payload['terms'] = $year->terms()->orderBy('position')->get()->map->toApiArray()->values()->all();

        return response()->json(['data' => $payload], 201);
    }

    public function update(Request $request, string $academicYear): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = AcademicYear::query()->findOrFail($academicYear);

        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:40'],
            'startsOn' => ['sometimes', 'date'],
            'endsOn' => ['sometimes', 'date', 'after:startsOn'],
            'isCurrent' => ['sometimes', 'boolean'],
        ], [
            'endsOn.after' => 'La date de fin doit être après la date de début.',
        ]);

        DB::transaction(function () use ($model, $validated): void {
            if (($validated['isCurrent'] ?? false) === true) {
                AcademicYear::query()
                    ->where('is_current', true)
                    ->where('id', '!=', $model->id)
                    ->update(['is_current' => false]);
            }

            $model->fill([
                'label' => $validated['label'] ?? $model->label,
                'starts_on' => $validated['startsOn'] ?? $model->starts_on,
                'ends_on' => $validated['endsOn'] ?? $model->ends_on,
                'is_current' => array_key_exists('isCurrent', $validated)
                    ? $validated['isCurrent']
                    : $model->is_current,
            ])->save();
        });

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $academicYear): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = AcademicYear::query()->findOrFail($academicYear);

        if ($model->classrooms()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une année qui contient des classes.',
            ], 422);
        }

        $model->terms()->delete();
        $model->delete();

        return response()->json(['message' => 'Année scolaire supprimée.']);
    }
}
