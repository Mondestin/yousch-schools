<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_attendance_marks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUlid('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('teacher_id');
            $table->date('date');
            $table->string('status');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->foreign('teacher_id')->references('id')->on('teachers')->cascadeOnDelete();
            $table->unique(['school_id', 'teacher_id', 'date']);
            $table->index(['school_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_attendance_marks');
    }
};
