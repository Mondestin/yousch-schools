<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('enrollment_id');
            $table->string('month', 7);
            $table->unsignedInteger('amount');
            $table->unsignedInteger('expected_amount');
            $table->string('status');
            $table->date('paid_on')->nullable();
            $table->string('method')->nullable();
            $table->timestamps();

            $table->foreign('enrollment_id')->references('id')->on('enrollments')->cascadeOnDelete();
            $table->unique(['enrollment_id', 'month']);
            $table->index('status');
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->date('date');
            $table->string('kind');
            $table->string('label');
            $table->text('description')->nullable();
            $table->unsignedInteger('amount');
            $table->string('method');
            $table->timestamps();

            $table->index(['date', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('payments');
    }
};
