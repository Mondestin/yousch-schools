<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marking_windows', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUlid('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('term_id');
            $table->string('type');
            $table->date('opens_on');
            $table->date('closes_on');
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('opened_notified_at')->nullable();
            $table->timestamp('closing_reminder_sent_at')->nullable();
            $table->timestamps();

            $table->foreign('term_id')->references('id')->on('terms')->cascadeOnDelete();
            $table->unique(['school_id', 'term_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marking_windows');
    }
};
