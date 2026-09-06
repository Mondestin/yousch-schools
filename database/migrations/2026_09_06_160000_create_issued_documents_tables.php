<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_templates', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUlid('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('kind');
            $table->string('code');
            $table->string('title');
            $table->text('body')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['school_id', 'kind', 'code']);
            $table->index(['school_id', 'kind', 'is_active']);
        });

        Schema::create('issued_documents', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUlid('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('document_template_id')->nullable();
            $table->string('student_id');
            $table->string('enrollment_id')->nullable();
            $table->string('academic_year_id')->nullable();
            $table->string('kind');
            $table->string('number');
            $table->string('title');
            $table->string('status')->default('issued');
            $table->date('issued_on');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('revoke_reason')->nullable();
            $table->json('payload');
            $table->string('file_url')->nullable();
            $table->string('file_mime')->nullable();
            $table->timestamps();

            $table->foreign('document_template_id')->references('id')->on('document_templates')->nullOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('enrollment_id')->references('id')->on('enrollments')->nullOnDelete();
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->nullOnDelete();

            $table->unique(['school_id', 'number']);
            $table->index(['school_id', 'student_id', 'status']);
            $table->index(['school_id', 'kind', 'issued_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issued_documents');
        Schema::dropIfExists('document_templates');
    }
};
