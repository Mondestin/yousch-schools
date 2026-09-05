<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admissions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('academic_year_id');
            $table->string('cycle');
            $table->string('classroom_id');
            $table->string('track_id')->nullable();
            $table->date('submitted_on');
            $table->string('status');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender');
            $table->date('born_on');
            $table->string('city');
            $table->string('neighborhood');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('guardian_last_name');
            $table->string('guardian_first_name');
            $table->string('guardian_phone');
            $table->string('guardian_relation');
            $table->text('notes')->nullable();
            $table->string('student_id')->nullable();
            $table->timestamps();

            $table->foreign('academic_year_id')->references('id')->on('academic_years')->cascadeOnDelete();
            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('track_id')->references('id')->on('tracks')->nullOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->nullOnDelete();
            $table->index('status');
        });

        Schema::create('reenrollments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('academic_year_id');
            $table->string('student_id');
            $table->string('previous_class');
            $table->string('classroom_id');
            $table->string('track_id')->nullable();
            $table->date('submitted_on');
            $table->string('status');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('academic_year_id')->references('id')->on('academic_years')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('track_id')->references('id')->on('tracks')->nullOnDelete();
            $table->unique(['student_id', 'academic_year_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reenrollments');
        Schema::dropIfExists('admissions');
    }
};
