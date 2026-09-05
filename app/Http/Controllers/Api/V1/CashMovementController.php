<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CashKind;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashMovementController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $query = CashMovement::query()->orderByDesc('date')->orderBy('id');

        if ($request->filled('kind')) {
            $query->where('kind', $request->string('kind'));
        }

        if ($request->filled('from')) {
            $query->whereDate('date', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('date', '<=', $request->string('to'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $validated = $this->validatedMovement($request);

        $movement = CashMovement::query()->create([
            'id' => ResourceId::make('ca'),
            'date' => $validated['date'],
            'kind' => $validated['kind'],
            'label' => $validated['label'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
            'method' => $validated['method'],
        ]);

        return response()->json(['data' => $movement->toApiArray()], 201);
    }

    public function update(Request $request, string $cashMovement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $model = CashMovement::query()->findOrFail($cashMovement);
        $validated = $this->validatedMovement($request);

        $model->update([
            'date' => $validated['date'],
            'kind' => $validated['kind'],
            'label' => $validated['label'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
            'method' => $validated['method'],
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $cashMovement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        CashMovement::query()->findOrFail($cashMovement)->delete();

        return response()->json(['message' => 'Mouvement de caisse supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedMovement(Request $request): array
    {
        return $request->validate([
            'date' => ['required', 'date'],
            'kind' => ['required', 'string', Rule::enum(CashKind::class)],
            'label' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'amount' => ['required', 'integer', 'min:1'],
            'method' => ['required', 'string', Rule::enum(PaymentMethod::class)],
        ], [
            'date.required' => 'La date est obligatoire.',
            'kind.required' => 'Le type de mouvement est obligatoire.',
            'label.required' => 'Le libellé est obligatoire.',
            'amount.required' => 'Le montant est obligatoire.',
            'amount.min' => 'Le montant doit être supérieur à 0.',
            'method.required' => 'Le mode de paiement est obligatoire.',
        ]);
    }
}
