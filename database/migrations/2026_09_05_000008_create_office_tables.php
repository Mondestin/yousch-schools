<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('reference')->unique();
            $table->string('name');
            $table->string('category');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('min_quantity');
            $table->unsignedInteger('unit_cost');
            $table->string('condition');
            $table->string('status');
            $table->string('location');
            $table->string('assignee')->nullable();
            $table->string('supplier')->nullable();
            $table->date('acquired_on')->nullable();
            $table->date('warranty_until')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('title');
            $table->text('body');
            $table->string('audience');
            $table->date('published_on');
            $table->date('expires_on')->nullable();
            $table->timestamps();

            $table->index(['audience', 'published_on']);
        });

        Schema::create('sanctions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id');
            $table->date('date');
            $table->string('type');
            $table->string('reason');
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->index(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanctions');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('inventory_items');
    }
};
