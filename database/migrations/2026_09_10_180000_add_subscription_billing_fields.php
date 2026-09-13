<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_subscriptions', function (Blueprint $table) {
            $table->string('billing_period', 16)->default('monthly')->after('monthly_amount');
            $table->string('billing_name')->nullable()->after('billing_period');
            $table->string('billing_email')->nullable()->after('billing_name');
            $table->string('billing_address')->nullable()->after('billing_email');
            $table->string('billing_city')->nullable()->after('billing_address');
            $table->string('billing_country')->nullable()->after('billing_city');
            $table->string('billing_vat')->nullable()->after('billing_country');
            $table->string('payment_provider', 32)->nullable()->after('billing_vat');
            $table->string('payment_phone', 32)->nullable()->after('payment_provider');
        });
    }

    public function down(): void
    {
        Schema::table('school_subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'billing_period',
                'billing_name',
                'billing_email',
                'billing_address',
                'billing_city',
                'billing_country',
                'billing_vat',
                'payment_provider',
                'payment_phone',
            ]);
        });
    }
};
