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
 * @property AttendanceStatus $status
 * @property string|null $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_id',
    'teacher_id',
    'date',
    'status',
    'note',
])]
class StaffAttendanceMark extends Model
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

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    /**
     * @return array{
     *     id: string,
     *     teacherId: string,
     *     date: string,
     *     status: string,
     *     note: string|null
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'teacherId' => $this->teacher_id,
            'date' => $this->date->format('Y-m-d'),
            'status' => $this->status->value,
            'note' => $this->note,
        ];
    }
}
