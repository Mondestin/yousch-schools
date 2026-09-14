<?php

namespace App\Enums;

enum StaffRole: string
{
    case Admin = 'admin';
    case Directeur = 'directeur';
    case Secretaire = 'secretaire';
    case Enseignant = 'enseignant';
    case Eleve = 'eleve';
    case Parent = 'parent';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Directeur => 'Directeur',
            self::Secretaire => 'Secrétaire',
            self::Enseignant => 'Enseignant',
            self::Eleve => 'Élève',
            self::Parent => 'Parent',
        };
    }

    public function isStaff(): bool
    {
        return match ($this) {
            self::Admin, self::Directeur, self::Secretaire, self::Enseignant => true,
            self::Eleve, self::Parent => false,
        };
    }

    /**
     * @return list<self>
     */
    public static function staffCases(): array
    {
        return array_values(array_filter(
            self::cases(),
            static fn (self $role): bool => $role->isStaff(),
        ));
    }

    /**
     * @return list<string>
     */
    public static function staffValues(): array
    {
        return array_map(
            static fn (self $role): string => $role->value,
            self::staffCases(),
        );
    }
}
