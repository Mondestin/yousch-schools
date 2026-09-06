<?php

namespace Database\Factories;

use App\Models\DossierFile;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DossierFile>
 */
class DossierFileFactory extends Factory
{
    protected $model = DossierFile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => 'df-'.Str::lower(Str::ulid()),
            'fileable_type' => Student::class,
            'fileable_id' => Student::factory(),
            'name' => fake()->word().'-'.fake()->word().'.pdf',
            'url' => '/storage/dossiers/'.Str::uuid().'.pdf',
            'mime' => 'application/pdf',
        ];
    }
}
