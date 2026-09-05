<?php

namespace App\Support\School;

use App\Enums\Cycle;
use App\Models\AcademicYear;
use App\Models\Admission;
use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\AttendanceMark;
use App\Models\CashMovement;
use App\Models\Classroom;
use App\Models\CycleSchedule;
use App\Models\Enrollment;
use App\Models\FeeTariff;
use App\Models\Grade;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\InventoryItem;
use App\Models\Mention;
use App\Models\Payment;
use App\Models\Reenrollment;
use App\Models\Sanction;
use App\Models\SchoolProfile;
use App\Models\SchoolSubscription;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\Term;
use App\Models\TimetableSlot;
use App\Models\Track;
use App\Models\User;
use App\Models\Venue;
use App\Support\SchoolCatalog;
use Illuminate\Support\Facades\DB;

/**
 * Builds the SchoolDataset shape from Eloquent, falling back to school.json
 * slices until each domain is seeded.
 */
final class SchoolDatasetAssembler
{
    /**
     * Prefer the database when taxonomy exists; otherwise the fixture.
     *
     * @return array<string, mixed>
     */
    public function assemble(): array
    {
        if (! AcademicYear::query()->exists()) {
            return SchoolCatalog::fixture();
        }

        return $this->fromDatabase();
    }

    /**
     * @return array<string, mixed>
     */
    public function fromDatabase(): array
    {
        $profile = SchoolProfile::query()->first();
        $fixture = SchoolCatalog::fixture();
        $peopleFromDatabase = Student::query()->exists();
        $staffFromDatabase = User::query()->whereNotNull('role')->exists();
        $subscriptionFromDatabase = SchoolSubscription::query()->exists();

        return [
            'profile' => $profile?->toApiArray() ?? $fixture['profile'],
            'subscription' => $subscriptionFromDatabase
                ? SchoolSubscription::query()
                    ->with('receipts')
                    ->first()
                    ->toApiArray()
                : $fixture['subscription'],
            'cycles' => array_map(
                static fn (Cycle $cycle): array => [
                    'value' => $cycle->value,
                    'label' => $cycle->label(),
                ],
                Cycle::cases(),
            ),
            'fees' => FeeTariff::query()
                ->orderBy('cycle')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'academicYears' => AcademicYear::query()
                ->orderByDesc('starts_on')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'terms' => Term::query()
                ->orderBy('position')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'gradeLevels' => GradeLevel::query()
                ->orderBy('position')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'tracks' => Track::query()
                ->orderBy('code')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'classrooms' => Classroom::query()
                ->orderBy('name')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'venues' => Venue::query()
                ->orderBy('name')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'schedules' => CycleSchedule::query()
                ->orderBy('cycle')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'mentions' => Mention::query()
                ->orderBy('min')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'roles' => $fixture['roles'],
            'students' => $peopleFromDatabase
                ? Student::query()
                    ->with('dossierFiles')
                    ->orderBy('last_name')
                    ->orderBy('first_name')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['students'],
            'guardians' => $peopleFromDatabase
                ? Guardian::query()
                    ->orderBy('last_name')
                    ->orderBy('first_name')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['guardians'],
            'studentGuardians' => $peopleFromDatabase
                ? DB::table('student_guardian')
                    ->orderBy('student_id')
                    ->orderBy('guardian_id')
                    ->get()
                    ->map(static fn (object $row): array => [
                        'studentId' => $row->student_id,
                        'guardianId' => $row->guardian_id,
                        'relation' => $row->relation,
                    ])
                    ->values()
                    ->all()
                : $fixture['studentGuardians'],
            'teachers' => $peopleFromDatabase
                ? Teacher::query()
                    ->with('files')
                    ->orderBy('last_name')
                    ->orderBy('first_name')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['teachers'],
            'teacherAssignments' => $peopleFromDatabase
                ? TeacherAssignment::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['teacherAssignments'],
            'subjects' => $peopleFromDatabase
                ? Subject::query()
                    ->with('files')
                    ->orderBy('code')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['subjects'],
            'enrollments' => $peopleFromDatabase
                ? Enrollment::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['enrollments'],
            'admissions' => Admission::query()->exists()
                ? Admission::query()
                    ->with('files')
                    ->orderByDesc('submitted_on')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['admissions'],
            'reenrollments' => Reenrollment::query()->exists()
                ? Reenrollment::query()
                    ->with('files')
                    ->orderByDesc('submitted_on')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['reenrollments'],
            'assessments' => Assessment::query()->exists()
                ? Assessment::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['assessments'],
            'timetableSlots' => TimetableSlot::query()->exists()
                ? TimetableSlot::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['timetableSlots'],
            'grades' => Grade::query()->exists()
                ? Grade::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['grades'],
            'payments' => Payment::query()->exists()
                ? Payment::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['payments'],
            'attendance' => AttendanceMark::query()->exists()
                ? AttendanceMark::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['attendance'],
            'inventory' => InventoryItem::query()->exists()
                ? InventoryItem::query()
                    ->orderBy('name')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['inventory'],
            'cashMovements' => CashMovement::query()->exists()
                ? CashMovement::query()
                    ->orderBy('id')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['cashMovements'],
            'announcements' => Announcement::query()->exists()
                ? Announcement::query()
                    ->orderByDesc('published_on')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['announcements'],
            'sanctions' => Sanction::query()->exists()
                ? Sanction::query()
                    ->orderByDesc('date')
                    ->get()
                    ->map->toApiArray()
                    ->values()
                    ->all()
                : $fixture['sanctions'],
            'staffUsers' => $staffFromDatabase
                ? User::query()
                    ->orderBy('name')
                    ->get()
                    ->map(static function (User $user): array {
                        $payload = $user->toStaffApiArray();
                        unset($payload['abilities']);

                        return $payload;
                    })
                    ->values()
                    ->all()
                : $fixture['staffUsers'],
        ];
    }
}
