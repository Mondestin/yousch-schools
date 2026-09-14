<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentReceiptMailNotification extends Notification
{
    public function __construct(
        public readonly Payment $payment,
        public readonly string $studentName,
        public readonly string $classroomName,
        public readonly string $monthLabel,
        public readonly string $schoolName,
        public readonly int $amount,
        public readonly string $pdfBinary,
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
        $amount = number_format($this->amount, 0, ',', ' ').' FCFA';

        return (new MailMessage)
            ->subject("Reçu de paiement - {$this->schoolName}")
            ->markdown('mail.payment-receipt', [
                'name' => $notifiable->name ?? 'Parent / tuteur',
                'schoolName' => $this->schoolName,
                'studentName' => $this->studentName,
                'classroomName' => $this->classroomName,
                'monthLabel' => $this->monthLabel,
                'amount' => $amount,
            ])
            ->attachData(
                $this->pdfBinary,
                'recu-paiement.pdf',
                ['mime' => 'application/pdf'],
            );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'paymentId' => $this->payment->id,
            'studentName' => $this->studentName,
            'month' => $this->payment->month,
            'amount' => $this->amount,
        ];
    }
}
