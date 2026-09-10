<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $teacher_id
 * @property Carbon $date
 * @property string $slot_id
 * @property AttendanceStatus $status
 * @property string|null $signature_data
 * @property Carbon|null $signed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_id',
    'teacher_id',
    'date',
    'slot_id',
    'status',
    'signature_data',
    'signed_at',
])]
class AttendanceSession extends Model
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
            'date' => 'date',
            'status' => AttendanceStatus::class,
            'signed_at' => 'datetime',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(TimetableSlot::class, 'slot_id');
    }

    /**
     * @return array{
     *     id: string,
     *     teacherId: string,
     *     date: string,
     *     slotId: string,
     *     status: string,
     *     signatureData: string|null,
     *     signedAt: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'teacherId' => $this->teacher_id,
            'date' => $this->date->format('Y-m-d'),
            'slotId' => $this->slot_id,
            'status' => $this->status->value,
            'signatureData' => $this->signature_data,
            'signedAt' => $this->signed_at?->toIso8601String(),
        ];
    }
}
