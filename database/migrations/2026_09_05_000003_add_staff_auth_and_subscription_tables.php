<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->string('role')->default('secretaire')->after('phone');
            $table->json('cycles')->nullable()->after('role');
            $table->timestamp('last_seen_at')->nullable()->after('cycles');
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('school_subscriptions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('plan');
            $table->string('status');
            $table->unsignedInteger('seats');
            $table->unsignedInteger('used_seats');
            $table->date('renews_on');
            $table->unsignedInteger('monthly_amount');
            $table->timestamps();
        });

        Schema::create('subscription_receipts', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('school_subscription_id');
            $table->string('reference');
            $table->string('period_label');
            $table->date('paid_on')->nullable();
            $table->unsignedInteger('amount');
            $table->string('plan');
            $table->string('method');
            $table->string('status');
            $table->timestamps();

            $table->foreign('school_subscription_id')
                ->references('id')
                ->on('school_subscriptions')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_receipts');
        Schema::dropIfExists('school_subscriptions');
        Schema::dropIfExists('personal_access_tokens');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'role', 'cycles', 'last_seen_at']);
        });
    }
};
