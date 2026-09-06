<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $school = School::query()->first();

        if ($school === null) {
            $school = School::query()->create([
                'name' => 'Complexe Scolaire Les Palmiers',
                'domain' => 'palmiers',
                'status' => 'active',
            ]);
        }

        CurrentSchool::set($school);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'school_id' => $school->id,
        ]);

        $this->call(SchoolTaxonomySeeder::class);

        $profile = $school->profile()->first();
        if ($profile !== null) {
            $school->forceFill([
                'name' => $profile->name,
                'domain' => str_contains(Str::slug($profile->name), 'palmiers')
                    ? 'palmiers'
                    : $school->domain,
            ])->save();
        }

        $this->call(SchoolPeopleSeeder::class);
        $this->call(SchoolAdmissionsSeeder::class);
        $this->call(SchoolTimetableSeeder::class);
        $this->call(SchoolGradesSeeder::class);
        $this->call(SchoolCashSeeder::class);
        $this->call(SchoolOfficeSeeder::class);
        $this->call(SchoolStaffSeeder::class);
    }
}
