<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Paye = 'paye';
    case Partiel = 'partiel';
    case Impaye = 'impaye';
}
