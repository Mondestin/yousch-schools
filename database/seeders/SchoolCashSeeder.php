<?php

namespace Database\Seeders;

use App\Models\CashMovement;
use App\Models\Enrollment;
use App\Models\Payment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SchoolCashSeeder extends Seeder
{
    public function run(): void
    {
        if (! Enrollment::query()->exists()) {
            return;
        }

        /** @var array<string, mixed> $dataset */
        $dataset = json_decode(
            File::get(resource_path('js/mocks/school.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        foreach ($dataset['payments'] as $payment) {
            Payment::query()->updateOrCreate(
                ['id' => $payment['id']],
                [
                    'enrollment_id' => $payment['enrollmentId'],
                    'month' => $payment['month'],
                    'amount' => $payment['amount'],
                    'expected_amount' => $payment['expectedAmount'],
                    'status' => $payment['status'],
                    'paid_on' => $payment['paidOn'] ?? null,
                    'method' => $payment['method'] ?? null,
                ],
            );
        }

        foreach ($dataset['cashMovements'] as $movement) {
            CashMovement::query()->updateOrCreate(
                ['id' => $movement['id']],
                [
                    'date' => $movement['date'],
                    'kind' => $movement['kind'],
                    'label' => $movement['label'],
                    'description' => $movement['description'] ?? null,
                    'amount' => $movement['amount'],
                    'method' => $movement['method'],
                ],
            );
        }
    }
}
