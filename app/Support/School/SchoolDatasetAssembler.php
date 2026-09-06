<?php

namespace App\Support\School;

use App\Enums\Cycle;
use App\Enums\StaffRole;
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
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Facades\DB;

/**
 * Builds the SchoolDataset shape from Eloquent for the current tenant.
 * The school.json fixture is only used when no school is bound (public welcome demo).
 */
final class SchoolDatasetAssembler
{
    /**
     * @return array<string, mixed>
     */
    public function assemble(): array
    {
        if (CurrentSchool::id() === null) {
            return SchoolCatalog::fixture();
        }

        return $this->fromDatabase();
    }

    /**
     * @return array<string, mixed>
     */
    public function fromDatabase(): array
    {
        if (! AcademicYear::query()->exists()) {
            FrenchAcademicCalendar::ensureCurrentYear();
        }

        $profile = SchoolProfile::query()->first();
        $subscription = SchoolSubscription::query()->with('receipts')->first();
        $mentions = Mention::query()
            ->orderBy('min')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return [
            'profile' => $profile?->toApiArray() ?? $this->emptyProfile(),
            'subscription' => $subscription?->toApiArray() ?? $this->emptySubscription(),
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
            'mentions' => $mentions !== [] ? $mentions : $this->defaultMentions(),
            'roles' => array_map(
                static fn (StaffRole $role): array => [
                    'value' => $role->value,
                    'label' => $role->label(),
                ],
                StaffRole::cases(),
            ),
            'students' => Student::query()
                ->with('dossierFiles')
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'guardians' => Guardian::query()
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'studentGuardians' => DB::table('student_guardian')
                ->whereIn('student_id', Student::query()->select('id'))
                ->orderBy('student_id')
                ->orderBy('guardian_id')
                ->get()
                ->map(static fn (object $row): array => [
                    'studentId' => $row->student_id,
                    'guardianId' => $row->guardian_id,
                    'relation' => $row->relation,
                ])
                ->values()
                ->all(),
            'teachers' => Teacher::query()
                ->with('files')
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'teacherAssignments' => TeacherAssignment::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'subjects' => Subject::query()
                ->with('files')
                ->orderBy('code')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'enrollments' => Enrollment::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'admissions' => Admission::query()
                ->with('files')
                ->orderByDesc('submitted_on')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'reenrollments' => Reenrollment::query()
                ->with('files')
                ->orderByDesc('submitted_on')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'assessments' => Assessment::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'timetableSlots' => TimetableSlot::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'grades' => Grade::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'payments' => Payment::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'attendance' => AttendanceMark::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'inventory' => InventoryItem::query()
                ->orderBy('name')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'cashMovements' => CashMovement::query()
                ->orderBy('id')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'announcements' => Announcement::query()
                ->orderByDesc('published_on')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'sanctions' => Sanction::query()
                ->orderByDesc('date')
                ->get()
                ->map->toApiArray()
                ->values()
                ->all(),
            'staffUsers' => User::query()
                ->where('school_id', CurrentSchool::id())
                ->orderBy('name')
                ->get()
                ->map(static function (User $user): array {
                    $payload = $user->toStaffApiArray();
                    unset($payload['abilities']);

                    return $payload;
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyProfile(): array
    {
        $school = CurrentSchool::get();

        return [
            'name' => $school?->name ?? '',
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
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptySubscription(): array
    {
        return [
            'plan' => 'gold',
            'status' => 'active',
            'seats' => 0,
            'usedSeats' => 0,
            'renewsOn' => now()->toDateString(),
            'monthlyAmount' => 0,
            'receipts' => [],
        ];
    }

    /**
     * @return list<array{code: string, label: string, min: float, max: float}>
     */
    private function defaultMentions(): array
    {
        return [
            ['code' => 'insuffisant', 'label' => 'Insuffisant', 'min' => 0.0, 'max' => 9.99],
            ['code' => 'passable', 'label' => 'Passable', 'min' => 10.0, 'max' => 11.99],
            ['code' => 'assez_bien', 'label' => 'Assez bien', 'min' => 12.0, 'max' => 13.99],
            ['code' => 'bien', 'label' => 'Bien', 'min' => 14.0, 'max' => 15.99],
            ['code' => 'tres_bien', 'label' => 'Très bien', 'min' => 16.0, 'max' => 20.0],
        ];
    }
}
