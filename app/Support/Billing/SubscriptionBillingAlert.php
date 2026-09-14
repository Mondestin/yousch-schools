<?php

namespace App\Support\Billing;

use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\SubscriptionValidationStatus;
use App\Models\SchoolSubscription;
use Illuminate\Support\Carbon;

final class SubscriptionBillingAlert
{
    /**
     * Soft warning shown in the app when billing needs attention (never a hard lock).
     *
     * @return array{level: string, code: string, message: string}|null
     */
    public static function for(?SchoolSubscription $subscription): ?array
    {
        if ($subscription === null) {
            return null;
        }

        if ($subscription->status === SubscriptionStatus::PastDue) {
            return [
                'level' => 'danger',
                'code' => 'past_due',
                'message' => 'Votre abonnement est en retard de paiement. Régularisez via Mobile Money dans Facturation.',
            ];
        }

        if ($subscription->status === SubscriptionStatus::Canceled) {
            return null;
        }

        $receipts = $subscription->relationLoaded('receipts')
            ? $subscription->receipts
            : $subscription->receipts()->get();

        $rejected = $receipts->first(
            fn ($receipt) => $receipt->validation_status === SubscriptionValidationStatus::Rejete,
        );

        if ($rejected !== null) {
            return [
                'level' => 'danger',
                'code' => 'rejected',
                'message' => sprintf(
                    'Le paiement %s a été rejeté. Saisissez un nouveau n° de transaction dans Facturation.',
                    $rejected->reference,
                ),
            ];
        }

        $pending = $receipts->first(
            fn ($receipt) => $receipt->validation_status === SubscriptionValidationStatus::EnAttente,
        );

        if ($pending !== null) {
            return [
                'level' => 'warning',
                'code' => 'pending_validation',
                'message' => sprintf(
                    'Le paiement %s (n° %s) est en attente de validation YouSch.',
                    $pending->reference,
                    $pending->transaction_id ?: '—',
                ),
            ];
        }

        $renewsOn = $subscription->renews_on;
        $unpaid = $receipts->first(
            fn ($receipt) => in_array($receipt->status, [PaymentStatus::Impaye, PaymentStatus::Partiel], true)
                && $receipt->validation_status !== SubscriptionValidationStatus::Valide,
        );

        if ($renewsOn instanceof Carbon && $renewsOn->isPast() && $unpaid !== null) {
            return [
                'level' => 'warning',
                'code' => 'unpaid',
                'message' => 'Une facture d’abonnement est échue. Envoyez le Mobile Money puis saisissez le n° de transaction.',
            ];
        }

        return null;
    }
}
