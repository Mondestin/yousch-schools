<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FeeReminderNotification extends Notification
{
    public function __construct(
        public readonly Payment $payment,
        public readonly string $studentName,
        public readonly string $classroomName,
        public readonly string $monthLabel,
        public readonly string $schoolName,
        public readonly int $dueAmount,
        public readonly ?string $customMessage = null,
        public readonly ?string $paymentUrl = null,
        public readonly ?string $pdfBinary = null,
        public readonly ?string $schoolPhone = null,
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
        $due = number_format($this->dueAmount, 0, ',', ' ').' FCFA';
        $message = (new MailMessage)
            ->subject("Rappel de frais scolaires - {$this->schoolName}")
            ->markdown('mail.fee-reminder', [
                'name' => $notifiable->name ?? 'Parent / tuteur',
                'schoolName' => $this->schoolName,
                'studentName' => $this->studentName,
                'classroomName' => $this->classroomName,
                'monthLabel' => $this->monthLabel,
                'dueAmount' => $due,
                'status' => $this->payment->status->label(),
                'customMessage' => $this->customMessage,
                'paymentUrl' => $this->paymentUrl,
                'schoolPhone' => $this->schoolPhone,
            ]);

        if (is_string($this->paymentUrl) && $this->paymentUrl !== '') {
            $message->action('Payer / voir le détail', $this->paymentUrl);
        }

        if (is_string($this->pdfBinary) && $this->pdfBinary !== '') {
            $message->attachData(
                $this->pdfBinary,
                'releve-paiements.pdf',
                ['mime' => 'application/pdf'],
            );
        }

        return $message;
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
            'dueAmount' => $this->dueAmount,
        ];
    }
}
