<?php

namespace App\Models;

use App\Enums\InventoryCondition;
use App\Enums\InventoryStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $reference
 * @property string $name
 * @property string $category
 * @property int $quantity
 * @property int $min_quantity
 * @property int $unit_cost
 * @property InventoryCondition $condition
 * @property InventoryStatus $status
 * @property string $location
 * @property string|null $assignee
 * @property string|null $supplier
 * @property Carbon|null $acquired_on
 * @property Carbon|null $warranty_until
 * @property string|null $notes
 */
#[Fillable([
    'id',
    'reference',
    'name',
    'category',
    'quantity',
    'min_quantity',
    'unit_cost',
    'condition',
    'status',
    'location',
    'assignee',
    'supplier',
    'acquired_on',
    'warranty_until',
    'notes',
])]
class InventoryItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'min_quantity' => 'integer',
            'unit_cost' => 'integer',
            'condition' => InventoryCondition::class,
            'status' => InventoryStatus::class,
            'acquired_on' => 'date',
            'warranty_until' => 'date',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'name' => $this->name,
            'category' => $this->category,
            'quantity' => $this->quantity,
            'minQuantity' => $this->min_quantity,
            'unitCost' => $this->unit_cost,
            'condition' => $this->condition->value,
            'status' => $this->status->value,
            'location' => $this->location,
            'assignee' => $this->assignee,
            'supplier' => $this->supplier,
            'acquiredOn' => $this->acquired_on?->format('Y-m-d'),
            'warrantyUntil' => $this->warranty_until?->format('Y-m-d'),
            'notes' => $this->notes,
        ];
    }
}
