<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LoginCodeNotification extends Notification
{
    public function __construct(
        public readonly string $code,
        public readonly string $schoolName,
        public readonly int $expiresInMinutes = 10,
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
        $name = $notifiable->name ?? 'Utilisateur';

        return (new MailMessage)
            ->subject('Code de connexion YouSch')
            ->markdown('mail.login-code', [
                'name' => $name,
                'code' => $this->code,
                'schoolName' => $this->schoolName,
                'expiresInMinutes' => $this->expiresInMinutes,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'schoolName' => $this->schoolName,
            'expiresInMinutes' => $this->expiresInMinutes,
        ];
    }
}
