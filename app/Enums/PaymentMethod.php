<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Especes = 'especes';
    case MobileMoney = 'mobile_money';
    case Virement = 'virement';
}
