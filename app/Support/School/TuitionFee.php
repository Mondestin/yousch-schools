<?php

namespace App\Support\School;

use App\Enums\PaymentStatus;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\FeeTariff;

final class TuitionFee
{
    public static function monthlyExpectedForEnrollment(Enrollment $enrollment): int
    {
        $classroom = Classroom::query()->find($enrollment->classroom_id);

        if ($classroom === null) {
            return 0;
        }

        return (int) (FeeTariff::query()
            ->where('cycle', $classroom->cycle->value)
            ->value('monthly_amount') ?? 0);
    }

    public static function statusFromAmount(int $amount, int $expectedAmount): PaymentStatus
    {
        if ($amount <= 0) {
            return PaymentStatus::Impaye;
        }

        if ($amount >= $expectedAmount) {
            return PaymentStatus::Paye;
        }

        return PaymentStatus::Partiel;
    }
}
