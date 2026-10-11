<?php

namespace App\Support\Portal;

use App\Models\Assessment;
use App\Models\AttendanceMark;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Guardian;
use App\Models\IdentityCard;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Collection;

/**
 * Builds portal payloads: profile/card theme, planning, notes, présences.
 */
final class PortalStudentPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function student(Student $student): array
    {
        $student->loadMissing(['enrollments', 'guardians', 'dossierFiles']);

        $payload = $student->toApiArray();
        $payload['enrollments'] = $student->enrollments->map->toApiArray()->values()->all();
        $payload['guardians'] = $student->guardians->map(static function (Guardian $guardian): array {
            $row = $guardian->toApiArray();
            $pivot = $guardian->getRelation('pivot');
            $row['relation'] = $pivot instanceof Pivot
                ? $pivot->getAttribute('relation')
                : null;

            return $row;
        })->values()->all();

        $payload['card'] = $this->card($student);
        $payload['theme'] = $this->theme();

        return $payload;
    }

    /**
     * Identity-card shaped payload for mobile (all fields + school theme).
     *
     * @return array<string, mixed>
     */
    public function card(Student $student): array
    {
        $student->loadMissing(['enrollments']);
        $enrollment = $this->currentEnrollment($student);
        $classroom = $enrollment !== null
            ? Classroom::query()->find($enrollment->classroom_id)
            : null;
        $classroomLabel = $classroom?->name ?? '';

        $profile = $this->schoolProfile();
        $identityCard = IdentityCard::query()
            ->where('subject_type', IdentityCard::SUBJECT_STUDENT)
            ->where('subject_id', $student->id)
            ->first();

        $fullName = trim($student->first_name.' '.$student->last_name);

        return [
            'kind' => 'student',
            'orientation' => 'horizontal',
            'theme' => $this->theme(),
            'school' => [
                'name' => $profile['name'],
                'logoUrl' => $profile['logoUrl'],
                'motto' => $profile['motto'],
                'city' => $profile['city'],
                'country' => $profile['country'],
                'phone' => $profile['phone'],
                'email' => $profile['email'],
                'address' => $profile['address'],
            ],
            'person' => [
                'id' => $student->id,
                'name' => $fullName,
                'subtitle' => $classroomLabel,
                'photoUrl' => $student->photo_url,
                'fields' => [
                    'matricule' => $student->matricule,
                    'bornOn' => $student->born_on->format('d/m/Y'),
                    'bornOnIso' => $student->born_on->format('Y-m-d'),
                    'phone' => $student->phone,
                    'classroom' => $classroomLabel !== '' ? $classroomLabel : null,
                    'gender' => $student->gender->value,
                    'city' => $student->city,
                    'neighborhood' => $student->neighborhood,
                    'address' => $student->address,
                    'email' => $student->email,
                    'enrolledOn' => $student->enrolled_on->format('Y-m-d'),
                ],
            ],
            'classroom' => $classroom?->toApiArray(),
            'enrollment' => $enrollment?->toApiArray(),
            'identityCard' => $identityCard?->toApiArray() ?? [
                'id' => null,
                'subjectType' => IdentityCard::SUBJECT_STUDENT,
                'subjectId' => $student->id,
                'status' => IdentityCard::STATUS_ACTIVE,
                'printedAt' => null,
                'blockedAt' => null,
                'revokedAt' => null,
                'revokeReason' => null,
            ],
        ];
    }

    /**
     * @return array{accent: string, body: string}
     */
    public function theme(): array
    {
        $profile = $this->schoolProfile();

        return [
            'accent' => $profile['idCardAccent'],
            'body' => $profile['idCardBody'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function schoolProfile(): array
    {
        $school = CurrentSchool::get();
        $profile = SchoolProfile::query()->first();

        if ($profile !== null) {
            return $profile->toApiArray();
        }

        return [
            'name' => $school?->name ?? 'École',
            'promoterName' => '',
            'directorName' => '',
            'city' => '',
            'country' => '',
            'phone' => '',
            'email' => '',
            'address' => '',
            'motto' => '',
            'currency' => 'FCFA',
            'logoUrl' => null,
            'stampUrl' => null,
            'idCardAccent' => '#6425d0',
            'idCardBody' => '#ffffff',
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function notes(Student $student, ?string $enrollmentId = null): array
    {
        $enrollmentIds = $this->enrollmentIds($student);

        if ($enrollmentId !== null) {
            if (! $enrollmentIds->contains($enrollmentId)) {
                return [];
            }
            $enrollmentIds = collect([$enrollmentId]);
        }

        /** @var Collection<int, Grade> $grades */
        $grades = Grade::query()
            ->with(['assessment', 'subject'])
            ->whereIn('enrollment_id', $enrollmentIds)
            ->orderBy('id')
            ->get();

        return $grades->map(function (Grade $grade): array {
            $row = $grade->toApiArray();
            /** @var Assessment|null $assessment */
            $assessment = $grade->assessment;
            /** @var Subject|null $subject */
            $subject = $grade->subject;

            $row['assessmentName'] = $assessment?->name;
            $row['assessmentType'] = $assessment?->type->value;
            $row['termId'] = $assessment?->term_id;
            $row['heldOn'] = $assessment?->held_on?->format('Y-m-d');
            $row['subjectName'] = $subject?->name;
            $row['subjectCode'] = $subject?->code;

            return $row;
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function presences(Student $student, ?string $date = null): array
    {
        $enrollmentIds = $this->enrollmentIds($student);

        $query = AttendanceMark::query()
            ->with(['subject'])
            ->whereIn('enrollment_id', $enrollmentIds)
            ->orderByDesc('date');

        if ($date !== null && $date !== '') {
            $query->whereDate('date', $date);
        }

        return $query->get()->map(function (AttendanceMark $mark): array {
            $row = $mark->toApiArray();
            /** @var Subject|null $subject */
            $subject = $mark->subject;
            $row['subjectName'] = $subject?->name;
            $row['subjectCode'] = $subject?->code;

            return $row;
        })->values()->all();
    }

    /**
     * @return array{data: list<array<string, mixed>>, classroomId: string|null, classroom: array<string, mixed>|null}
     */
    public function planning(Student $student): array
    {
        $enrollment = $this->currentEnrollment($student);

        if ($enrollment === null) {
            return [
                'data' => [],
                'classroomId' => null,
                'classroom' => null,
            ];
        }

        $classroom = Classroom::query()->find($enrollment->classroom_id);

        $slots = TimetableSlot::query()
            ->with(['subject', 'teacher', 'classroom'])
            ->where('classroom_id', $enrollment->classroom_id)
            ->orderBy('weekday')
            ->orderBy('period_id')
            ->get();

        $data = $slots->map(function (TimetableSlot $slot): array {
            $row = $slot->toApiArray();
            /** @var Subject|null $subject */
            $subject = $slot->subject;
            /** @var Teacher|null $teacher */
            $teacher = $slot->teacher;

            $row['subjectName'] = $subject?->name;
            $row['subjectCode'] = $subject?->code;
            $row['teacherName'] = $teacher !== null
                ? trim($teacher->first_name.' '.$teacher->last_name)
                : null;
            $row['classroomName'] = $slot->classroom?->name;

            return $row;
        })->values()->all();

        return [
            'data' => $data,
            'classroomId' => $enrollment->classroom_id,
            'classroom' => $classroom?->toApiArray(),
        ];
    }

    private function currentEnrollment(Student $student): ?Enrollment
    {
        if ($student->relationLoaded('enrollments')) {
            return $student->enrollments->sortByDesc('created_at')->first();
        }

        return Enrollment::query()
            ->where('student_id', $student->id)
            ->orderByDesc('created_at')
            ->first();
    }

    /**
     * @return Collection<int, string>
     */
    private function enrollmentIds(Student $student): Collection
    {
        if ($student->relationLoaded('enrollments')) {
            return $student->enrollments->pluck('id');
        }

        return Enrollment::query()
            ->where('student_id', $student->id)
            ->pluck('id');
    }
}
