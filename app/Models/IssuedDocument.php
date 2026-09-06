<?php

namespace App\Models;

use App\Enums\DocumentKind;
use App\Enums\IssuedDocumentStatus;
use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string|null $document_template_id
 * @property string $student_id
 * @property string|null $enrollment_id
 * @property string|null $academic_year_id
 * @property DocumentKind $kind
 * @property string $number
 * @property string $title
 * @property IssuedDocumentStatus $status
 * @property Carbon $issued_on
 * @property int|null $issued_by
 * @property Carbon|null $revoked_at
 * @property int|null $revoked_by
 * @property string|null $revoke_reason
 * @property array<string, mixed> $payload
 * @property string|null $file_url
 * @property string|null $file_mime
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'id',
    'school_id',
    'document_template_id',
    'student_id',
    'enrollment_id',
    'academic_year_id',
    'kind',
    'number',
    'title',
    'status',
    'issued_on',
    'issued_by',
    'revoked_at',
    'revoked_by',
    'revoke_reason',
    'payload',
    'file_url',
    'file_mime',
])]
class IssuedDocument extends Model
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
            'status' => IssuedDocumentStatus::class,
            'issued_on' => 'date',
            'revoked_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    /**
     * @return BelongsTo<DocumentTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'document_template_id');
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Enrollment, $this>
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
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
    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function isRevoked(): bool
    {
        return $this->status === IssuedDocumentStatus::Revoked;
    }

    /**
     * @return array{
     *     id: string,
     *     templateId: string|null,
     *     studentId: string,
     *     enrollmentId: string|null,
     *     academicYearId: string|null,
     *     kind: string,
     *     number: string,
     *     title: string,
     *     status: string,
     *     statusLabel: string,
     *     issuedOn: string,
     *     issuedBy: int|null,
     *     revokedAt: string|null,
     *     revokeReason: string|null,
     *     fileUrl: string|null,
     *     fileMime: string|null,
     *     payload: array<string, mixed>,
     *     studentName: string|null,
     *     studentMatricule: string|null,
     *     yearLabel: string|null
     * }
     */
    public function toApiArray(): array
    {
        $student = $this->relationLoaded('student') ? $this->student : null;
        $year = $this->relationLoaded('academicYear') ? $this->academicYear : null;

        return [
            'id' => $this->id,
            'templateId' => $this->document_template_id,
            'studentId' => $this->student_id,
            'enrollmentId' => $this->enrollment_id,
            'academicYearId' => $this->academic_year_id,
            'kind' => $this->kind->value,
            'number' => $this->number,
            'title' => $this->title,
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),
            'issuedOn' => $this->issued_on->format('Y-m-d'),
            'issuedBy' => $this->issued_by,
            'revokedAt' => $this->revoked_at?->toIso8601String(),
            'revokeReason' => $this->revoke_reason,
            'fileUrl' => $this->file_url,
            'fileMime' => $this->file_mime,
            'payload' => $this->payload,
            'studentName' => $student !== null
                ? trim($student->last_name.' '.$student->first_name)
                : null,
            'studentMatricule' => $student?->matricule,
            'yearLabel' => $year?->label,
        ];
    }
}
