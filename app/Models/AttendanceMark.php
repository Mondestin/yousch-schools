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
 * @property string $enrollment_id
 * @property Carbon $date
 * @property AttendanceStatus $status
 * @property string|null $slot_id
 * @property string|null $period_id
 * @property string|null $subject_id
 * @property string|null $note
 * @property string|null $document_url
 * @property string|null $document_name
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'enrollment_id',
    'date',
    'status',
    'slot_id',
    'period_id',
    'subject_id',
    'note',
    'document_url',
    'document_name',
    'school_id',
])]
class AttendanceMark extends Model
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
        ];
    }

    /**
     * @return BelongsTo<Enrollment, $this>
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * @return BelongsTo<TimetableSlot, $this>
     */
    public function slot(): BelongsTo
    {
        return $this->belongsTo(TimetableSlot::class, 'slot_id');
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * @return array{
     *     id: string,
     *     enrollmentId: string,
     *     date: string,
     *     status: string,
     *     slotId: string|null,
     *     periodId: string|null,
     *     subjectId: string|null,
     *     note: string|null,
     *     documentUrl: string|null,
     *     documentName: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'enrollmentId' => $this->enrollment_id,
            'date' => $this->date->format('Y-m-d'),
            'status' => $this->status->value,
            'slotId' => $this->slot_id,
            'periodId' => $this->period_id,
            'subjectId' => $this->subject_id,
            'note' => $this->note,
            'documentUrl' => $this->document_url,
            'documentName' => $this->document_name,
        ];
    }
}
