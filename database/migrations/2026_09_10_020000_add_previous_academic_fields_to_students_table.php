<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('previous_school_name')->nullable()->after('photo_url');
            $table->string('previous_academic_year')->nullable()->after('previous_school_name');
            $table->string('previous_class')->nullable()->after('previous_academic_year');
            $table->string('previous_school_city')->nullable()->after('previous_class');
            $table->boolean('is_transfer')->default(false)->after('previous_school_city');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'previous_school_name',
                'previous_academic_year',
                'previous_class',
                'previous_school_city',
                'is_transfer',
            ]);
        });
    }
};
