<?php

namespace App\Models;

use App\Enums\VenueKind;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property VenueKind $kind
 * @property string|null $building
 * @property int $capacity
 * @property bool $available
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'name',
    'kind',
    'building',
    'capacity',
    'available',
    'school_id',
])]
class Venue extends Model
{
    use BelongsToSchool;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => VenueKind::class,
            'capacity' => 'integer',
            'available' => 'boolean',
        ];
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     kind: string,
     *     building: string|null,
     *     capacity: int,
     *     available: bool
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'kind' => $this->kind->value,
            'building' => $this->building,
            'capacity' => $this->capacity,
            'available' => $this->available,
        ];
    }
}
