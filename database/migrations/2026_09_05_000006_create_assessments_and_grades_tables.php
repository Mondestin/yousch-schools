<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('type');
            $table->string('name');
            $table->string('classroom_id');
            $table->string('subject_id');
            $table->string('term_id');
            $table->date('held_on');
            $table->string('held_at', 8);
            $table->string('held_until', 8);
            $table->timestamps();

            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
            $table->foreign('term_id')->references('id')->on('terms')->cascadeOnDelete();
            $table->index(['classroom_id', 'term_id']);
        });

        Schema::create('grades', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('enrollment_id');
            $table->string('assessment_id');
            $table->string('subject_id');
            $table->decimal('score', 4, 2);
            $table->timestamps();

            $table->foreign('enrollment_id')->references('id')->on('enrollments')->cascadeOnDelete();
            $table->foreign('assessment_id')->references('id')->on('assessments')->cascadeOnDelete();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
            $table->unique(['enrollment_id', 'assessment_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
        Schema::dropIfExists('assessments');
    }
};
