<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $subject_type
 * @property string $subject_id
 * @property string $status
 * @property Carbon|null $printed_at
 * @property int|null $printed_by
 * @property Carbon|null $blocked_at
 * @property int|null $blocked_by
 * @property Carbon|null $revoked_at
 * @property int|null $revoked_by
 * @property string|null $revoke_reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'school_id',
    'subject_type',
    'subject_id',
    'status',
    'printed_at',
    'printed_by',
    'blocked_at',
    'blocked_by',
    'revoked_at',
    'revoked_by',
    'revoke_reason',
])]
class IdentityCard extends Model
{
    use BelongsToSchool;
    use HasUlids;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_BLOCKED = 'blocked';

    public const STATUS_REVOKED = 'revoked';

    public const SUBJECT_STUDENT = 'student';

    public const SUBJECT_TEACHER = 'teacher';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'printed_at' => 'datetime',
            'blocked_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function printer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'printed_by');
    }

    /**
     * @return array{
     *     id: string,
     *     subjectType: string,
     *     subjectId: string,
     *     status: string,
     *     printedAt: string|null,
     *     blockedAt: string|null,
     *     revokedAt: string|null,
     *     revokeReason: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'subjectType' => $this->subject_type,
            'subjectId' => $this->subject_id,
            'status' => $this->status,
            'printedAt' => $this->printed_at?->toIso8601String(),
            'blockedAt' => $this->blocked_at?->toIso8601String(),
            'revokedAt' => $this->revoked_at?->toIso8601String(),
            'revokeReason' => $this->revoke_reason,
        ];
    }
}
