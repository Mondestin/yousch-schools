<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timetable_slots', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('academic_year_id');
            $table->string('classroom_id');
            $table->string('weekday');
            $table->string('period_id');
            $table->string('subject_id');
            $table->string('teacher_id');
            $table->string('room')->nullable();
            $table->timestamps();

            $table->foreign('academic_year_id')->references('id')->on('academic_years')->cascadeOnDelete();
            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
            $table->foreign('teacher_id')->references('id')->on('teachers')->cascadeOnDelete();
            $table->unique(['classroom_id', 'weekday', 'period_id']);
            $table->index(['teacher_id', 'weekday', 'period_id']);
        });

        Schema::create('attendance_marks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('enrollment_id');
            $table->date('date');
            $table->string('status');
            $table->string('slot_id')->nullable();
            $table->string('period_id')->nullable();
            $table->string('subject_id')->nullable();
            $table->text('note')->nullable();
            $table->string('document_url')->nullable();
            $table->string('document_name')->nullable();
            $table->timestamps();

            $table->foreign('enrollment_id')->references('id')->on('enrollments')->cascadeOnDelete();
            $table->foreign('slot_id')->references('id')->on('timetable_slots')->nullOnDelete();
            $table->foreign('subject_id')->references('id')->on('subjects')->nullOnDelete();
            $table->index(['enrollment_id', 'date']);
            $table->index(['date', 'slot_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_marks');
        Schema::dropIfExists('timetable_slots');
    }
};
