<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\Enrollment;
use App\Models\Grade;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SchoolGradesSeeder extends Seeder
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

        foreach ($dataset['assessments'] as $assessment) {
            Assessment::query()->updateOrCreate(
                ['id' => $assessment['id']],
                [
                    'type' => $assessment['type'],
                    'name' => $assessment['name'],
                    'classroom_id' => $assessment['classroomId'],
                    'subject_id' => $assessment['subjectId'],
                    'term_id' => $assessment['termId'],
                    'held_on' => $assessment['heldOn'],
                    'held_at' => $assessment['heldAt'],
                    'held_until' => $assessment['heldUntil'],
                ],
            );
        }

        foreach ($dataset['grades'] as $grade) {
            Grade::query()->updateOrCreate(
                ['id' => $grade['id']],
                [
                    'enrollment_id' => $grade['enrollmentId'],
                    'assessment_id' => $grade['assessmentId'],
                    'subject_id' => $grade['subjectId'],
                    'score' => $grade['score'],
                ],
            );
        }
    }
}
