<?php

namespace App\Enums;

enum IssuedDocumentStatus: string
{
    case Issued = 'issued';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Issued => 'Émis',
            self::Revoked => 'Révoqué',
        };
    }
}
