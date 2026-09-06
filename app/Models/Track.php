<?php

namespace App\Models;

use App\Enums\Cycle;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property Cycle $cycle
 * @property string $code
 * @property string $name
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'cycle',
    'code',
    'name',
    'school_id',
])]
class Track extends Model
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
            'cycle' => Cycle::class,
        ];
    }

    /**
     * @return HasMany<Classroom, $this>
     */
    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    /**
     * @return array{
     *     id: string,
     *     cycle: string,
     *     code: string,
     *     name: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'cycle' => $this->cycle->value,
            'code' => $this->code,
            'name' => $this->name,
        ];
    }
}
