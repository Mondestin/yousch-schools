<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
{
    protected $model = Student::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => 'st-'.Str::lower(Str::ulid()),
            'matricule' => 'MAT-'.fake()->unique()->numerify('####'),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'gender' => fake()->randomElement(Gender::cases())->value,
            'born_on' => fake()->dateTimeBetween('-18 years', '-6 years')->format('Y-m-d'),
            'city' => 'Brazzaville',
            'neighborhood' => fake()->randomElement(['Poto-Poto', 'Bacongo', 'Moungali', 'Ouenzé']),
            'address' => fake()->optional()->streetAddress(),
            'phone' => fake()->optional()->numerify('06#######'),
            'email' => fake()->optional()->safeEmail(),
            'enrolled_on' => fake()->dateTimeBetween('-2 years', 'now')->format('Y-m-d'),
            'photo_url' => null,
        ];
    }
}
