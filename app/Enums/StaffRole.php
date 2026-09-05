<?php

namespace App\Enums;

enum StaffRole: string
{
    case Admin = 'admin';
    case Directeur = 'directeur';
    case Secretaire = 'secretaire';
    case Enseignant = 'enseignant';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Directeur => 'Directeur',
            self::Secretaire => 'Secrétaire',
            self::Enseignant => 'Enseignant',
        };
    }
}
