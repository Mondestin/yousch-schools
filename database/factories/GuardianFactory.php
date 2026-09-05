<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Models\Guardian;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Guardian>
 */
class GuardianFactory extends Factory
{
    protected $model = Guardian::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => 'gu-'.Str::lower(Str::ulid()),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'phone' => fake()->numerify('06#######'),
            'profession' => fake()->jobTitle(),
            'gender' => fake()->optional()->randomElement(Gender::cases())?->value,
            'email' => fake()->optional()->safeEmail(),
            'city' => 'Brazzaville',
            'neighborhood' => fake()->optional()->randomElement(['Poto-Poto', 'Bacongo', 'Moungali']),
            'address' => fake()->optional()->streetAddress(),
        ];
    }
}
