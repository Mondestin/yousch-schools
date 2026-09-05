<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Sanction;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SanctionController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $query = Sanction::query()->orderByDesc('date');

        if ($request->filled('studentId')) {
            $query->where('student_id', $request->string('studentId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $validated = $this->validatedSanction($request);

        $sanction = Sanction::query()->create([
            'id' => ResourceId::make('sn'),
            'student_id' => $validated['studentId'],
            'date' => $validated['date'],
            'type' => $validated['type'],
            'reason' => $validated['reason'],
        ]);

        return response()->json(['data' => $sanction->toApiArray()], 201);
    }

    public function update(Request $request, string $sanction): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        $model = Sanction::query()->findOrFail($sanction);
        $validated = $this->validatedSanction($request);

        $model->update([
            'student_id' => $validated['studentId'],
            'date' => $validated['date'],
            'type' => $validated['type'],
            'reason' => $validated['reason'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $sanction): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'students')) {
            return $denied;
        }

        Sanction::query()->findOrFail($sanction)->delete();

        return response()->json(['message' => 'Sanction supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedSanction(Request $request): array
    {
        return $request->validate([
            'studentId' => ['required', 'string', 'exists:students,id'],
            'date' => ['required', 'date'],
            'type' => ['required', 'string', 'max:120'],
            'reason' => ['required', 'string', 'max:255'],
        ], [
            'studentId.required' => 'L’élève est obligatoire.',
            'date.required' => 'La date est obligatoire.',
            'type.required' => 'Le type de sanction est obligatoire.',
            'reason.required' => 'Le motif est obligatoire.',
        ]);
    }
}
