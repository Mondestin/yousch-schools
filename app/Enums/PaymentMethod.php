<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Especes = 'especes';
    case MtnMoney = 'mtn_money';
    case AirtelMoney = 'airtel_money';
    case Virement = 'virement';
    /** Legacy generic Mobile Money (no operator). Prefer mtn_money / airtel_money. */
    case MobileMoney = 'mobile_money';

    public function label(): string
    {
        return match ($this) {
            self::Especes => 'Espèces',
            self::MtnMoney => 'MTN Mobile Money',
            self::AirtelMoney => 'Airtel Money',
            self::Virement => 'Virement',
            self::MobileMoney => 'Mobile money',
        };
    }

    public function isMobileMoney(): bool
    {
        return in_array($this, [self::MtnMoney, self::AirtelMoney, self::MobileMoney], true);
    }
}
