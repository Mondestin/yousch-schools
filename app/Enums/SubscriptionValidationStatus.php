<?php

namespace App\Enums;

enum SubscriptionValidationStatus: string
{
    case EnAttente = 'en_attente';
    case Valide = 'valide';
    case Rejete = 'rejete';

    public function label(): string
    {
        return match ($this) {
            self::EnAttente => 'En attente de validation',
            self::Valide => 'Validé',
            self::Rejete => 'Rejeté',
        };
    }
}
