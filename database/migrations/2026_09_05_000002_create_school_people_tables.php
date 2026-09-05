<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('matricule')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender');
            $table->date('born_on');
            $table->string('city');
            $table->string('neighborhood');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->date('enrolled_on');
            $table->string('photo_url')->nullable();
            $table->timestamps();
        });

        Schema::create('guardians', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('phone');
            $table->string('profession');
            $table->string('gender')->nullable();
            $table->string('email')->nullable();
            $table->string('city')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('address')->nullable();
            $table->timestamps();
        });

        Schema::create('student_guardian', function (Blueprint $table) {
            $table->string('student_id');
            $table->string('guardian_id');
            $table->string('relation');
            $table->timestamps();

            $table->primary(['student_id', 'guardian_id']);
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('guardian_id')->references('id')->on('guardians')->cascadeOnDelete();
        });

        Schema::create('teachers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('code')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('phone');
            $table->string('gender');
            $table->string('qualification');
            $table->date('hired_on');
            $table->date('born_on')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('position')->nullable();
            $table->string('city');
            $table->string('neighborhood');
            $table->string('marital_status');
            $table->string('status');
            $table->string('photo_url')->nullable();
            $table->timestamps();
        });

        Schema::create('subjects', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('code');
            $table->string('name');
            $table->string('textbook')->nullable();
            $table->decimal('coefficient', 4, 2)->nullable();
            $table->string('cycle');
            $table->string('grade_level_id');
            $table->string('track_id')->nullable();
            $table->timestamps();

            $table->foreign('grade_level_id')->references('id')->on('grade_levels')->cascadeOnDelete();
            $table->foreign('track_id')->references('id')->on('tracks')->nullOnDelete();
            $table->unique(['cycle', 'grade_level_id', 'code', 'track_id']);
        });

        Schema::create('enrollments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id');
            $table->string('classroom_id');
            $table->string('academic_year_id');
            $table->string('track_id')->nullable();
            $table->string('status');
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->cascadeOnDelete();
            $table->foreign('track_id')->references('id')->on('tracks')->nullOnDelete();
            $table->unique(['student_id', 'academic_year_id']);
        });

        Schema::create('teacher_assignments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('teacher_id');
            $table->string('academic_year_id');
            $table->string('classroom_id');
            $table->string('subject_id');
            $table->string('track_id')->nullable();
            $table->timestamps();

            $table->foreign('teacher_id')->references('id')->on('teachers')->cascadeOnDelete();
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->cascadeOnDelete();
            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
            $table->foreign('track_id')->references('id')->on('tracks')->nullOnDelete();
        });

        Schema::create('dossier_files', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('fileable_type');
            $table->string('fileable_id');
            $table->string('name');
            $table->string('url');
            $table->string('mime');
            $table->timestamps();

            $table->index(['fileable_type', 'fileable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dossier_files');
        Schema::dropIfExists('teacher_assignments');
        Schema::dropIfExists('enrollments');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('teachers');
        Schema::dropIfExists('student_guardian');
        Schema::dropIfExists('guardians');
        Schema::dropIfExists('students');
    }
};
