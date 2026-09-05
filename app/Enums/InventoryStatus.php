<?php

namespace App\Enums;

enum InventoryStatus: string
{
    case EnService = 'en_service';
    case EnStock = 'en_stock';
    case EnReparation = 'en_reparation';
    case Reforme = 'reforme';
}
