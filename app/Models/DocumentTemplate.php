<?php

namespace App\Models;

use App\Enums\DocumentKind;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property DocumentKind $kind
 * @property string $code
 * @property string $title
 * @property string|null $body
 * @property bool $is_active
 * @property bool $is_system
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_id',
    'kind',
    'code',
    'title',
    'body',
    'is_active',
    'is_system',
])]
class DocumentTemplate extends Model
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
            'kind' => DocumentKind::class,
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    /**
     * @return HasMany<IssuedDocument, $this>
     */
    public function issuedDocuments(): HasMany
    {
        return $this->hasMany(IssuedDocument::class);
    }

    /**
     * @return array{
     *     id: string,
     *     kind: string,
     *     code: string,
     *     title: string,
     *     body: string|null,
     *     isActive: bool,
     *     isSystem: bool
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'code' => $this->code,
            'title' => $this->title,
            'body' => $this->body,
            'isActive' => $this->is_active,
            'isSystem' => $this->is_system,
        ];
    }
}
