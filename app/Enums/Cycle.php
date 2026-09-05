<?php

namespace App\Enums;

enum Cycle: string
{
    case Prescolaire = 'prescolaire';
    case Primaire = 'primaire';
    case College = 'college';
    case LyceeGeneral = 'lycee_general';
    case LyceeTechnique = 'lycee_technique';

    public function label(): string
    {
        return match ($this) {
            self::Prescolaire => 'Préscolaire',
            self::Primaire => 'Primaire',
            self::College => 'Collège',
            self::LyceeGeneral => 'Lycée Général',
            self::LyceeTechnique => 'Lycée Technique',
        };
    }

    public function isLycee(): bool
    {
        return $this === self::LyceeGeneral || $this === self::LyceeTechnique;
    }

    public function needsCoefficient(): bool
    {
        return match ($this) {
            self::College, self::LyceeGeneral, self::LyceeTechnique => true,
            default => false,
        };
    }
}
