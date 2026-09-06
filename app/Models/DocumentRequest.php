<?php

namespace App\Models;

use App\Enums\DocumentKind;
use App\Enums\DocumentRequestStatus;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property string|null $academic_year_id
 * @property DocumentKind $kind
 * @property DocumentRequestStatus $status
 * @property string|null $note
 * @property int|null $requested_by
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property string|null $review_note
 * @property string|null $issued_document_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_id',
    'student_id',
    'academic_year_id',
    'kind',
    'status',
    'note',
    'requested_by',
    'reviewed_by',
    'reviewed_at',
    'review_note',
    'issued_document_id',
])]
class DocumentRequest extends Model
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
            'status' => DocumentRequestStatus::class,
            'reviewed_at' => 'datetime',
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
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * @return BelongsTo<IssuedDocument, $this>
     */
    public function issuedDocument(): BelongsTo
    {
        return $this->belongsTo(IssuedDocument::class, 'issued_document_id');
    }

    /**
     * @return array{
     *     id: string,
     *     studentId: string,
     *     academicYearId: string|null,
     *     kind: string,
     *     kindLabel: string,
     *     status: string,
     *     statusLabel: string,
     *     note: string|null,
     *     requestedBy: int|null,
     *     requesterName: string|null,
     *     reviewedBy: int|null,
     *     reviewedAt: string|null,
     *     reviewNote: string|null,
     *     issuedDocumentId: string|null,
     *     createdAt: string|null,
     *     studentName: string|null,
     *     studentMatricule: string|null,
     *     yearLabel: string|null
     * }
     */
    public function toApiArray(): array
    {
        $student = $this->relationLoaded('student') ? $this->student : null;
        $year = $this->relationLoaded('academicYear') ? $this->academicYear : null;
        $requester = $this->relationLoaded('requester') ? $this->requester : null;

        return [
            'id' => $this->id,
            'studentId' => $this->student_id,
            'academicYearId' => $this->academic_year_id,
            'kind' => $this->kind->value,
            'kindLabel' => $this->kind->label(),
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),
            'note' => $this->note,
            'requestedBy' => $this->requested_by,
            'requesterName' => $requester?->name,
            'reviewedBy' => $this->reviewed_by,
            'reviewedAt' => $this->reviewed_at?->toIso8601String(),
            'reviewNote' => $this->review_note,
            'issuedDocumentId' => $this->issued_document_id,
            'createdAt' => $this->created_at?->toIso8601String(),
            'studentName' => $student !== null
                ? trim($student->last_name.' '.$student->first_name)
                : null,
            'studentMatricule' => $student?->matricule,
            'yearLabel' => $year?->label,
        ];
    }
}
