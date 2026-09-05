<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $this->call(SchoolTaxonomySeeder::class);
        $this->call(SchoolPeopleSeeder::class);
        $this->call(SchoolAdmissionsSeeder::class);
        $this->call(SchoolTimetableSeeder::class);
        $this->call(SchoolGradesSeeder::class);
        $this->call(SchoolCashSeeder::class);
        $this->call(SchoolOfficeSeeder::class);
        $this->call(SchoolStaffSeeder::class);
    }
}
