<?php

namespace App\Enums;

enum MentionCode: string
{
    case Insuffisant = 'insuffisant';
    case Passable = 'passable';
    case AssezBien = 'assez_bien';
    case Bien = 'bien';
    case TresBien = 'tres_bien';
}
