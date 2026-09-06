<?php

namespace App\Support\School;

use App\Enums\DocumentKind;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Track;
use App\Support\SchoolCatalog;

/**
 * Generated school document payload for official issuable documents.
 */
final class SchoolDocumentBuilder
{
    /**
     * @return array<string, mixed>|null
     */
    public function forStudent(string $studentId, string $kind, ?string $academicYearId = null): ?array
    {
        if (! in_array($kind, DocumentKind::issuableValues(), true)) {
            return null;
        }

        $documentKind = DocumentKind::from($kind);
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

        $issuedOn = now();
        $issuedOn->locale('fr');
        $bornOn = $student->born_on;
        $bornOn->locale('fr');

        return [
            'kind' => $kind,
            'title' => $documentKind->label(),
            'issuedOn' => $issuedOn->translatedFormat('j F Y'),
            'name' => trim($student->first_name.' '.$student->last_name),
            'classroomName' => $classroom !== null ? $classroom->name : '-',
            'yearLabel' => $year !== null ? $year->label : '-',
            'trackCode' => $track?->code,
            'student' => $student->toApiArray(),
            'enrollment' => $enrollment->toApiArray(),
            'classroom' => $classroom?->toApiArray(),
            'year' => $year?->toApiArray(),
            'track' => $track?->toApiArray(),
            'genderLabel' => $student->gender->label(),
            'bornOnLabel' => $bornOn->translatedFormat('j F Y'),
            'profile' => $profilePayload,
            'files' => array_values($student->dossierFiles->map->toApiArray()->all()),
        ];
    }
}
