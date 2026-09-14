<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Paye = 'paye';
    case Partiel = 'partiel';
    case Impaye = 'impaye';

    public function label(): string
    {
        return match ($this) {
            self::Paye => 'Payé',
            self::Partiel => 'Partiel',
            self::Impaye => 'Impayé',
        };
    }
}
