<?php

namespace Database\Factories;

use App\Enums\Cycle;
use App\Models\Subject;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Subject>
 */
class SubjectFactory extends Factory
{
    protected $model = Subject::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->lexify('???'));

        return [
            'id' => 'su-'.Str::lower(Str::ulid()),
            'code' => $code,
            'name' => fake()->words(2, true),
            'textbook' => fake()->optional()->sentence(3),
            'coefficient' => fake()->randomFloat(1, 1, 4),
            'cycle' => Cycle::LyceeGeneral->value,
            'grade_level_id' => 'gl-2nde-g',
            'track_id' => null,
        ];
    }
}
