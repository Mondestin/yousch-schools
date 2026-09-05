<?php

namespace Database\Seeders;

use App\Models\AttendanceMark;
use App\Models\Enrollment;
use App\Models\TimetableSlot;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SchoolTimetableSeeder extends Seeder
{
    public function run(): void
    {
        if (! Enrollment::query()->exists()) {
            return;
        }

        /** @var array<string, mixed> $dataset */
        $dataset = json_decode(
            File::get(resource_path('js/mocks/school.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        foreach ($dataset['timetableSlots'] as $slot) {
            TimetableSlot::query()->updateOrCreate(
                ['id' => $slot['id']],
                [
                    'academic_year_id' => $slot['academicYearId'],
                    'classroom_id' => $slot['classroomId'],
                    'weekday' => $slot['weekday'],
                    'period_id' => $slot['periodId'],
                    'subject_id' => $slot['subjectId'],
                    'teacher_id' => $slot['teacherId'],
                    'room' => $slot['room'] ?? null,
                ],
            );
        }

        foreach ($dataset['attendance'] as $mark) {
            AttendanceMark::query()->updateOrCreate(
                ['id' => $mark['id']],
                [
                    'enrollment_id' => $mark['enrollmentId'],
                    'date' => $mark['date'],
                    'status' => $mark['status'],
                    'slot_id' => $mark['slotId'] ?? null,
                    'period_id' => $mark['periodId'] ?? null,
                    'subject_id' => $mark['subjectId'] ?? null,
                    'note' => $mark['note'] ?? null,
                    'document_url' => $mark['documentUrl'] ?? null,
                    'document_name' => $mark['documentName'] ?? null,
                ],
            );
        }
    }
}
