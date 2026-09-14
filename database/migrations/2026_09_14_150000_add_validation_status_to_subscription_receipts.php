<?php

use App\Enums\PaymentStatus;
use App\Enums\SubscriptionValidationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_receipts', function (Blueprint $table) {
            $table->string('validation_status', 32)->nullable()->after('transaction_id');
        });

        $rows = DB::table('subscription_receipts')->get(['id', 'status']);

        foreach ($rows as $row) {
            $status = (string) $row->status;

            if ($status === SubscriptionValidationStatus::EnAttente->value) {
                DB::table('subscription_receipts')->where('id', $row->id)->update([
                    'status' => PaymentStatus::Impaye->value,
                    'validation_status' => SubscriptionValidationStatus::EnAttente->value,
                ]);

                continue;
            }

            if ($status === SubscriptionValidationStatus::Valide->value) {
                DB::table('subscription_receipts')->where('id', $row->id)->update([
                    'status' => PaymentStatus::Paye->value,
                    'validation_status' => SubscriptionValidationStatus::Valide->value,
                ]);

                continue;
            }

            if ($status === SubscriptionValidationStatus::Rejete->value) {
                DB::table('subscription_receipts')->where('id', $row->id)->update([
                    'status' => PaymentStatus::Impaye->value,
                    'validation_status' => SubscriptionValidationStatus::Rejete->value,
                ]);
            }
        }
    }

    public function down(): void
    {
        $rows = DB::table('subscription_receipts')
            ->whereNotNull('validation_status')
            ->get(['id', 'status', 'validation_status']);

        foreach ($rows as $row) {
            $validation = (string) $row->validation_status;

            if (in_array($validation, [
                SubscriptionValidationStatus::EnAttente->value,
                SubscriptionValidationStatus::Valide->value,
                SubscriptionValidationStatus::Rejete->value,
            ], true)) {
                DB::table('subscription_receipts')->where('id', $row->id)->update([
                    'status' => $validation,
                ]);
            }
        }

        Schema::table('subscription_receipts', function (Blueprint $table) {
            $table->dropColumn('validation_status');
        });
    }
};
