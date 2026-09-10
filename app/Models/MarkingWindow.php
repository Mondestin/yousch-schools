<?php

namespace App\Models;

use App\Enums\AssessmentType;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $term_id
 * @property AssessmentType $type
 * @property Carbon $opens_on
 * @property Carbon $closes_on
 * @property Carbon|null $closed_at
 * @property Carbon|null $opened_notified_at
 * @property Carbon|null $closing_reminder_sent_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_id',
    'term_id',
    'type',
    'opens_on',
    'closes_on',
    'closed_at',
    'opened_notified_at',
    'closing_reminder_sent_at',
])]
class MarkingWindow extends Model
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
            'type' => AssessmentType::class,
            'opens_on' => 'date',
            'closes_on' => 'date',
            'closed_at' => 'datetime',
            'opened_notified_at' => 'datetime',
            'closing_reminder_sent_at' => 'datetime',
        ];
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    /**
     * @return array{
     *     id: string,
     *     termId: string,
     *     type: string,
     *     opensOn: string,
     *     closesOn: string,
     *     closedAt: string|null,
     *     openedNotifiedAt: string|null,
     *     closingReminderSentAt: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'termId' => $this->term_id,
            'type' => $this->type->value,
            'opensOn' => $this->opens_on->format('Y-m-d'),
            'closesOn' => $this->closes_on->format('Y-m-d'),
            'closedAt' => $this->closed_at?->toIso8601String(),
            'openedNotifiedAt' => $this->opened_notified_at?->toIso8601String(),
            'closingReminderSentAt' => $this->closing_reminder_sent_at?->toIso8601String(),
        ];
    }
}
