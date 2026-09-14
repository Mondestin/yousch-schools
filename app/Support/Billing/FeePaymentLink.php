<?php

namespace App\Support\Billing;

use App\Models\Payment;
use Illuminate\Support\Facades\URL;

final class FeePaymentLink
{
    public static function temporaryUrl(Payment $payment, int $days = 21): string
    {
        return URL::temporarySignedRoute(
            'fees.pay',
            now()->addDays($days),
            ['payment' => $payment->id],
        );
    }
}
