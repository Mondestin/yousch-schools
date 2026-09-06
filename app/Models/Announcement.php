<?php

namespace App\Models;

use App\Enums\AnnouncementAudience;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $title
 * @property string $body
 * @property AnnouncementAudience $audience
 * @property Carbon $published_on
 * @property Carbon|null $expires_on
 */
#[Fillable([
    'id',
    'title',
    'body',
    'audience',
    'published_on',
    'expires_on',
    'school_id',
])]
class Announcement extends Model
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
            'audience' => AnnouncementAudience::class,
            'published_on' => 'date',
            'expires_on' => 'date',
        ];
    }

    /**
     * @return array{
     *     id: string,
     *     title: string,
     *     body: string,
     *     audience: string,
     *     publishedOn: string,
     *     expiresOn: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' => $this->body,
            'audience' => $this->audience->value,
            'publishedOn' => $this->published_on->format('Y-m-d'),
            'expiresOn' => $this->expires_on?->format('Y-m-d'),
        ];
    }
}
