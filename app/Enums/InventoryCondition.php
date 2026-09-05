<?php

namespace App\Enums;

enum InventoryCondition: string
{
    case Bon = 'bon';
    case Use = 'use';
    case HorsService = 'hors_service';
}
