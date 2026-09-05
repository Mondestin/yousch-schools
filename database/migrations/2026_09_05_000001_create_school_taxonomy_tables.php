<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_profiles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('promoter_name');
            $table->string('director_name');
            $table->string('city');
            $table->string('country');
            $table->string('phone');
            $table->string('email');
            $table->string('address');
            $table->string('motto');
            $table->string('currency', 8)->default('FCFA');
            $table->string('logo_url')->nullable();
            $table->string('stamp_url')->nullable();
            $table->timestamps();
        });

        Schema::create('fee_tariffs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('cycle');
            $table->unsignedInteger('monthly_amount');
            $table->unsignedInteger('enrollment_amount');
            $table->unsignedInteger('re_enrollment_amount');
            $table->timestamps();
            $table->unique('cycle');
        });

        Schema::create('academic_years', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('label');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->boolean('is_current')->default(false);
            $table->timestamps();
        });

        Schema::create('terms', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('academic_year_id');
            $table->string('name');
            $table->unsignedTinyInteger('position');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->timestamps();

            $table->foreign('academic_year_id')
                ->references('id')
                ->on('academic_years')
                ->cascadeOnDelete();
        });

        Schema::create('grade_levels', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('cycle');
            $table->string('code');
            $table->string('name');
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->unique(['cycle', 'code']);
        });

        Schema::create('tracks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('cycle');
            $table->string('code');
            $table->string('name');
            $table->timestamps();

            $table->unique(['cycle', 'code']);
        });

        Schema::create('classrooms', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('academic_year_id');
            $table->string('cycle');
            $table->string('grade_level_id');
            $table->string('track_id')->nullable();
            $table->string('code');
            $table->string('name');
            $table->string('section')->nullable();
            $table->unsignedSmallInteger('capacity');
            $table->timestamps();

            $table->foreign('academic_year_id')
                ->references('id')
                ->on('academic_years')
                ->cascadeOnDelete();
            $table->foreign('grade_level_id')
                ->references('id')
                ->on('grade_levels')
                ->cascadeOnDelete();
            $table->foreign('track_id')
                ->references('id')
                ->on('tracks')
                ->nullOnDelete();
            $table->unique(['academic_year_id', 'cycle', 'code']);
        });

        Schema::create('venues', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('kind');
            $table->string('building')->nullable();
            $table->unsignedSmallInteger('capacity');
            $table->boolean('available')->default(true);
            $table->timestamps();
        });

        Schema::create('cycle_schedules', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('cycle')->unique();
            $table->json('hours');
            $table->json('periods');
            $table->timestamps();
        });

        Schema::create('mentions', function (Blueprint $table) {
            $table->string('code')->primary();
            $table->string('label');
            $table->decimal('min', 4, 2);
            $table->decimal('max', 4, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mentions');
        Schema::dropIfExists('cycle_schedules');
        Schema::dropIfExists('venues');
        Schema::dropIfExists('classrooms');
        Schema::dropIfExists('tracks');
        Schema::dropIfExists('grade_levels');
        Schema::dropIfExists('terms');
        Schema::dropIfExists('academic_years');
        Schema::dropIfExists('fee_tariffs');
        Schema::dropIfExists('school_profiles');
    }
};
