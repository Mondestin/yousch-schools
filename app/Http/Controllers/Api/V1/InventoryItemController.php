<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\InventoryCondition;
use App\Enums\InventoryStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'inventory')) {
            return $denied;
        }

        $query = InventoryItem::query()->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('q')) {
            $needle = '%'.mb_strtolower((string) $request->string('q')).'%';
            $query->where(function ($builder) use ($needle): void {
                $builder
                    ->whereRaw('lower(name) like ?', [$needle])
                    ->orWhereRaw('lower(reference) like ?', [$needle])
                    ->orWhereRaw('lower(category) like ?', [$needle]);
            });
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'inventory')) {
            return $denied;
        }

        $validated = $this->validatedItem($request);

        $item = InventoryItem::query()->create([
            'id' => ResourceId::make('inv'),
            ...$this->toAttributes($validated),
        ]);

        return response()->json(['data' => $item->toApiArray()], 201);
    }

    public function update(Request $request, string $inventoryItem): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'inventory')) {
            return $denied;
        }

        $model = InventoryItem::query()->findOrFail($inventoryItem);
        $validated = $this->validatedItem($request, $model);
        $model->update($this->toAttributes($validated));

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $inventoryItem): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'inventory')) {
            return $denied;
        }

        InventoryItem::query()->findOrFail($inventoryItem)->delete();

        return response()->json(['message' => 'Article d’inventaire supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedItem(Request $request, ?InventoryItem $existing = null): array
    {
        return $request->validate([
            'reference' => [
                'required',
                'string',
                'max:80',
                Rule::unique('inventory_items', 'reference')->ignore($existing?->id),
            ],
            'name' => ['required', 'string', 'max:180'],
            'category' => ['required', 'string', 'max:120'],
            'quantity' => ['required', 'integer', 'min:0'],
            'minQuantity' => ['required', 'integer', 'min:0'],
            'unitCost' => ['required', 'integer', 'min:0'],
            'condition' => ['required', 'string', Rule::enum(InventoryCondition::class)],
            'status' => ['required', 'string', Rule::enum(InventoryStatus::class)],
            'location' => ['required', 'string', 'max:180'],
            'assignee' => ['nullable', 'string', 'max:120'],
            'supplier' => ['nullable', 'string', 'max:180'],
            'acquiredOn' => ['nullable', 'date'],
            'warrantyUntil' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ], [
            'reference.required' => 'La référence est obligatoire.',
            'reference.unique' => 'Cette référence existe déjà.',
            'name.required' => 'Le nom est obligatoire.',
            'category.required' => 'La catégorie est obligatoire.',
            'quantity.required' => 'La quantité est obligatoire.',
            'minQuantity.required' => 'Le seuil minimum est obligatoire.',
            'unitCost.required' => 'Le coût unitaire est obligatoire.',
            'condition.required' => 'L’état est obligatoire.',
            'status.required' => 'Le statut est obligatoire.',
            'location.required' => 'L’emplacement est obligatoire.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function toAttributes(array $validated): array
    {
        return [
            'reference' => $validated['reference'],
            'name' => $validated['name'],
            'category' => $validated['category'],
            'quantity' => $validated['quantity'],
            'min_quantity' => $validated['minQuantity'],
            'unit_cost' => $validated['unitCost'],
            'condition' => $validated['condition'],
            'status' => $validated['status'],
            'location' => $validated['location'],
            'assignee' => $validated['assignee'] ?? null,
            'supplier' => $validated['supplier'] ?? null,
            'acquired_on' => $validated['acquiredOn'] ?? null,
            'warranty_until' => $validated['warrantyUntil'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];
    }
}
