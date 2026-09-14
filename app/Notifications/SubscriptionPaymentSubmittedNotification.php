<?php

namespace App\Notifications;

use App\Models\SubscriptionReceipt;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionPaymentSubmittedNotification extends Notification
{
    public function __construct(
        public readonly SubscriptionReceipt $receipt,
        public readonly string $schoolName,
        public readonly string $providerLabel,
        public readonly string $collectionPhone,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $amount = number_format($this->receipt->amount, 0, ',', ' ').' FCFA';

        return (new MailMessage)
            ->subject("Paiement d’abonnement reçu — {$this->schoolName}")
            ->markdown('mail.subscription-payment-submitted', [
                'name' => $notifiable->name ?? 'Responsable',
                'schoolName' => $this->schoolName,
                'reference' => $this->receipt->reference,
                'periodLabel' => $this->receipt->period_label,
                'amount' => $amount,
                'transactionId' => $this->receipt->transaction_id,
                'providerLabel' => $this->providerLabel,
                'collectionPhone' => $this->collectionPhone,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'receiptId' => $this->receipt->id,
            'transactionId' => $this->receipt->transaction_id,
            'amount' => $this->receipt->amount,
        ];
    }
}
