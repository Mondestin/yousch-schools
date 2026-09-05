<?php

namespace App\Models;

use Database\Factories\DossierFileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $fileable_type
 * @property string $fileable_id
 * @property string $name
 * @property string $url
 * @property string $mime
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'fileable_type',
    'fileable_id',
    'name',
    'url',
    'mime',
])]
class DossierFile extends Model
{
    /** @use HasFactory<DossierFileFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return MorphTo<Model, $this>
     */
    public function fileable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     url: string,
     *     mime: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'mime' => $this->mime,
        ];
    }
}
