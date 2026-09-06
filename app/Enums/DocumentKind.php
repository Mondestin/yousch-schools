<?php

namespace App\Enums;

enum DocumentKind: string
{
    case Bulletin = 'bulletin';
    case Attestation = 'attestation';
    case Certificat = 'certificat';
    case PaymentStatement = 'payment_statement';
    case PaymentReceipt = 'payment_receipt';

    public function label(): string
    {
        return match ($this) {
            self::Bulletin => 'Bulletin de notes',
            self::Attestation => 'Attestation de scolarité',
            self::Certificat => 'Certificat de fréquentation',
            self::PaymentStatement => 'Relevé de paiements',
            self::PaymentReceipt => 'Reçu de paiement',
        };
    }
}
