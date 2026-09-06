<?php

namespace Database\Factories;

use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<School>
 */
class SchoolFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company().' School';

        return [
            'name' => $name,
            'domain' => Str::lower(Str::random(8)),
            'status' => 'active',
        ];
    }

    public function domain(string $domain): static
    {
        return $this->state(fn (): array => [
            'domain' => $domain,
        ]);
    }
}
