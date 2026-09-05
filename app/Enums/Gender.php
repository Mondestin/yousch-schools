<?php

namespace App\Enums;

enum Gender: string
{
    case Femme = 'femme';
    case Homme = 'homme';

    public function label(): string
    {
        return match ($this) {
            self::Femme => 'Féminin',
            self::Homme => 'Masculin',
        };
    }
}
