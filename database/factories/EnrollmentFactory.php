<?php

namespace Database\Factories;

use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    protected $model = Enrollment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => 'en-'.Str::lower(Str::ulid()),
            'student_id' => Student::factory(),
            'classroom_id' => 'cr-2nde-c',
            'academic_year_id' => 'year-2026',
            'track_id' => 'tr-c',
            'status' => EnrollmentStatus::Inscrit->value,
        ];
    }

    public function secondeC(): static
    {
        return $this->state(fn (): array => [
            'classroom_id' => 'cr-2nde-c',
            'track_id' => 'tr-c',
        ]);
    }

    public function terminaleF2(): static
    {
        return $this->state(fn (): array => [
            'classroom_id' => 'cr-tle-f2',
            'track_id' => 'tr-f2',
        ]);
    }
}
