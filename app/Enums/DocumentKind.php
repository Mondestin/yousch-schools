<?php

namespace App\Enums;

enum DocumentKind: string
{
    case Bulletin = 'bulletin';
    case Attestation = 'attestation';
    case Certificat = 'certificat';
    case AttestationReussite = 'attestation_reussite';
    case AttestationRadiation = 'attestation_radiation';
    case AttestationTransfert = 'attestation_transfert';
    case AttestationBourse = 'attestation_bourse';
    case CertificatConduite = 'certificat_conduite';
    case PaymentStatement = 'payment_statement';
    case PaymentReceipt = 'payment_receipt';

    public function label(): string
    {
        return match ($this) {
            self::Bulletin => 'Bulletin de notes',
            self::Attestation => 'Attestation de scolarité',
            self::Certificat => 'Certificat de fréquentation',
            self::AttestationReussite => 'Attestation de réussite / passage',
            self::AttestationRadiation => 'Attestation de radiation',
            self::AttestationTransfert => 'Attestation de transfert',
            self::AttestationBourse => 'Attestation pour bourse / transport',
            self::CertificatConduite => 'Certificat de bonne conduite',
            self::PaymentStatement => 'Relevé de paiements',
            self::PaymentReceipt => 'Reçu de paiement',
        };
    }

    public function hint(): string
    {
        return match ($this) {
            self::Attestation => 'Inscription et démarches administratives',
            self::Certificat => 'Présence régulière dans l’établissement',
            self::AttestationReussite => 'Passage en classe supérieure',
            self::AttestationRadiation => 'Fin de scolarité dans l’établissement',
            self::AttestationTransfert => 'Changement d’établissement',
            self::AttestationBourse => 'Demande de bourse ou de transport',
            self::CertificatConduite => 'Comportement et discipline (optionnel)',
            self::Bulletin => 'Notes et moyenne du trimestre',
            self::PaymentStatement => 'Situation des frais scolaires',
            self::PaymentReceipt => 'Preuve d’un paiement enregistré',
            default => '',
        };
    }

    public function isIssuable(): bool
    {
        return in_array($this, self::issuable(), true);
    }

    public function isOptional(): bool
    {
        return $this === self::CertificatConduite;
    }

    public function numberPrefix(): string
    {
        return match ($this) {
            self::Attestation => 'ATT',
            self::Certificat => 'CER',
            self::AttestationReussite => 'ARS',
            self::AttestationRadiation => 'ARD',
            self::AttestationTransfert => 'ATR',
            self::AttestationBourse => 'ABO',
            self::CertificatConduite => 'CBC',
            default => 'DOC',
        };
    }

    /**
     * @return list<self>
     */
    public static function issuable(): array
    {
        return [
            self::Attestation,
            self::Certificat,
            self::AttestationReussite,
            self::AttestationRadiation,
            self::AttestationTransfert,
            self::AttestationBourse,
            self::CertificatConduite,
        ];
    }

    /**
     * @return list<string>
     */
    public static function issuableValues(): array
    {
        return array_map(
            static fn (self $kind): string => $kind->value,
            self::issuable(),
        );
    }
}
