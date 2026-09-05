<?php

namespace App\Support\School;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Track;
use App\Support\SchoolCatalog;

/**
 * Generated school document payload for attestation / certificat preview.
 */
final class SchoolDocumentBuilder
{
    /**
     * @return array<string, mixed>|null
     */
    public function forStudent(string $studentId, string $kind, ?string $academicYearId = null): ?array
    {
        if (! in_array($kind, ['attestation', 'certificat'], true)) {
            return null;
        }

        $student = Student::query()->with('dossierFiles')->find($studentId);

        if ($student === null) {
            return null;
        }

        $enrollmentQuery = Enrollment::query()->where('student_id', $studentId);

        if ($academicYearId !== null) {
            $enrollmentQuery->where('academic_year_id', $academicYearId);
        }

        $enrollment = $enrollmentQuery->first()
            ?? Enrollment::query()->where('student_id', $studentId)->first();

        if ($enrollment === null) {
            return null;
        }

        $classroom = Classroom::query()->find($enrollment->classroom_id);
        $year = AcademicYear::query()->find($enrollment->academic_year_id);
        $track = $enrollment->track_id !== null
            ? Track::query()->find($enrollment->track_id)
            : null;
        $profile = SchoolProfile::query()->first();
        $profilePayload = $profile?->toApiArray() ?? SchoolCatalog::fixture()['profile'];

        $title = $kind === 'attestation'
            ? 'Attestation de scolarité'
            : 'Certificat de fréquentation';

        return [
            'kind' => $kind,
            'title' => $title,
            'issuedOn' => now()->locale('fr')->translatedFormat('j F Y'),
            'name' => trim($student->first_name.' '.$student->last_name),
            'classroomName' => $classroom?->name ?? '—',
            'yearLabel' => $year?->label ?? '—',
            'trackCode' => $track?->code,
            'student' => $student->toApiArray(),
            'enrollment' => $enrollment->toApiArray(),
            'classroom' => $classroom?->toApiArray(),
            'year' => $year?->toApiArray(),
            'track' => $track?->toApiArray(),
            'genderLabel' => $student->gender->label(),
            'bornOnLabel' => $student->born_on->locale('fr')->translatedFormat('j F Y'),
            'profile' => $profilePayload,
            'files' => $student->dossierFiles->map->toApiArray()->values()->all(),
        ];
    }
}
