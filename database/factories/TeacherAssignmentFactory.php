<?php

namespace Database\Factories;

use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TeacherAssignment>
 */
class TeacherAssignmentFactory extends Factory
{
    protected $model = TeacherAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => 'ta-'.Str::lower(Str::ulid()),
            'teacher_id' => Teacher::factory(),
            'academic_year_id' => 'year-2026',
            'classroom_id' => 'cr-2nde-c',
            'subject_id' => Subject::factory(),
            'track_id' => 'tr-c',
        ];
    }
}
