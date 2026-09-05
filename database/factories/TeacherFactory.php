<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Enums\TeacherStatus;
use App\Models\Teacher;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Teacher>
 */
class TeacherFactory extends Factory
{
    protected $model = Teacher::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => 'te-'.Str::lower(Str::ulid()),
            'code' => 'ENS-'.fake()->unique()->numerify('###'),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'phone' => fake()->numerify('06#######'),
            'gender' => fake()->randomElement(Gender::cases())->value,
            'qualification' => fake()->randomElement(['Licence', 'Master', 'CAPES']),
            'hired_on' => fake()->dateTimeBetween('-10 years', '-1 month')->format('Y-m-d'),
            'born_on' => fake()->optional()->dateTimeBetween('-60 years', '-25 years')?->format('Y-m-d'),
            'email' => fake()->optional()->safeEmail(),
            'address' => fake()->optional()->streetAddress(),
            'position' => fake()->optional()->randomElement(['Professeur', 'Professeur principal']),
            'city' => 'Brazzaville',
            'neighborhood' => fake()->randomElement(['Poto-Poto', 'Bacongo', 'Moungali']),
            'marital_status' => fake()->randomElement(['célibataire', 'marié', 'mariée']),
            'status' => TeacherStatus::Actif->value,
            'photo_url' => null,
        ];
    }
}
