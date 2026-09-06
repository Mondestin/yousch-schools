<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $student_id
 * @property Carbon $date
 * @property string $type
 * @property string $reason
 */
#[Fillable([
    'id',
    'student_id',
    'date',
    'type',
    'reason',
    'school_id',
])]
class Sanction extends Model
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
        ];
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return array{
     *     id: string,
     *     studentId: string,
     *     date: string,
     *     type: string,
     *     reason: string
     * }
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'studentId' => $this->student_id,
            'date' => $this->date->format('Y-m-d'),
            'type' => $this->type,
            'reason' => $this->reason,
        ];
    }
}
