<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /** @var list<string> */
    private array $tenantTables = [
        'school_profiles',
        'fee_tariffs',
        'academic_years',
        'terms',
        'grade_levels',
        'tracks',
        'classrooms',
        'venues',
        'cycle_schedules',
        'students',
        'guardians',
        'teachers',
        'subjects',
        'enrollments',
        'teacher_assignments',
        'dossier_files',
        'school_subscriptions',
        'subscription_receipts',
        'admissions',
        'reenrollments',
        'timetable_slots',
        'attendance_marks',
        'assessments',
        'grades',
        'payments',
        'cash_movements',
        'inventory_items',
        'announcements',
        'sanctions',
        'users',
    ];

    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('domain')->unique();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        $schoolId = (string) Str::ulid();
        $profileName = DB::table('school_profiles')->value('name') ?? 'École';
        $domain = $this->slugDomain(is_string($profileName) ? $profileName : 'ecole');

        DB::table('schools')->insert([
            'id' => $schoolId,
            'name' => is_string($profileName) ? $profileName : 'École',
            'domain' => $domain,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email']);
        });

        Schema::table('fee_tariffs', function (Blueprint $table) {
            $table->dropUnique(['cycle']);
        });

        Schema::table('grade_levels', function (Blueprint $table) {
            $table->dropUnique(['cycle', 'code']);
        });

        Schema::table('tracks', function (Blueprint $table) {
            $table->dropUnique(['cycle', 'code']);
        });

        Schema::table('cycle_schedules', function (Blueprint $table) {
            $table->dropUnique(['cycle']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique(['matricule']);
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropUnique(['code']);
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique(['cycle', 'grade_level_id', 'code', 'track_id']);
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropUnique(['reference']);
        });

        foreach ($this->tenantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($schoolId, $tableName) {
                $table->ulid('school_id')->default($schoolId);
                $table->foreign('school_id')
                    ->references('id')
                    ->on('schools')
                    ->cascadeOnDelete();
                $table->index('school_id');

                if ($tableName === 'users') {
                    $table->boolean('is_platform_admin')->default(false);
                }
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique(['school_id', 'email']);
        });

        Schema::table('fee_tariffs', function (Blueprint $table) {
            $table->unique(['school_id', 'cycle']);
        });

        Schema::table('grade_levels', function (Blueprint $table) {
            $table->unique(['school_id', 'cycle', 'code']);
        });

        Schema::table('tracks', function (Blueprint $table) {
            $table->unique(['school_id', 'cycle', 'code']);
        });

        Schema::table('cycle_schedules', function (Blueprint $table) {
            $table->unique(['school_id', 'cycle']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->unique(['school_id', 'matricule']);
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->unique(['school_id', 'code']);
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->unique(['school_id', 'cycle', 'grade_level_id', 'code', 'track_id']);
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->unique(['school_id', 'reference']);
        });

        Schema::table('school_profiles', function (Blueprint $table) {
            $table->unique('school_id');
        });

        Schema::table('school_subscriptions', function (Blueprint $table) {
            $table->unique('school_id');
        });
    }

    public function down(): void
    {
        Schema::table('school_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['school_id']);
        });

        Schema::table('school_profiles', function (Blueprint $table) {
            $table->dropUnique(['school_id']);
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'reference']);
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'cycle', 'grade_level_id', 'code', 'track_id']);
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'code']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'matricule']);
        });

        Schema::table('cycle_schedules', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'cycle']);
        });

        Schema::table('tracks', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'cycle', 'code']);
        });

        Schema::table('grade_levels', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'cycle', 'code']);
        });

        Schema::table('fee_tariffs', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'cycle']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'email']);
        });

        foreach (array_reverse($this->tenantTables) as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign(['school_id']);
                $table->dropIndex(['school_id']);
                $table->dropColumn('school_id');

                if ($tableName === 'users') {
                    $table->dropColumn('is_platform_admin');
                }
            });
        }

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->unique('reference');
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->unique(['cycle', 'grade_level_id', 'code', 'track_id']);
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->unique('code');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->unique('matricule');
        });

        Schema::table('cycle_schedules', function (Blueprint $table) {
            $table->unique('cycle');
        });

        Schema::table('tracks', function (Blueprint $table) {
            $table->unique(['cycle', 'code']);
        });

        Schema::table('grade_levels', function (Blueprint $table) {
            $table->unique(['cycle', 'code']);
        });

        Schema::table('fee_tariffs', function (Blueprint $table) {
            $table->unique('cycle');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('email');
        });

        Schema::dropIfExists('schools');
    }

    private function slugDomain(string $name): string
    {
        $slug = Str::slug($name);

        if ($slug === '' || $slug === 'ecole') {
            return 'palmiers';
        }

        if (str_contains($slug, 'palmiers')) {
            return 'palmiers';
        }

        return Str::limit($slug, 48, '');
    }
};
