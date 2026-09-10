<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUlid('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('teacher_id');
            $table->date('date');
            $table->string('slot_id');
            $table->string('status');
            $table->longText('signature_data')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();

            $table->foreign('teacher_id')->references('id')->on('teachers')->cascadeOnDelete();
            $table->foreign('slot_id')->references('id')->on('timetable_slots')->cascadeOnDelete();
            $table->unique(['school_id', 'teacher_id', 'date', 'slot_id']);
            $table->index(['school_id', 'date']);
            $table->index(['slot_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
