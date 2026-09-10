<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffAccountCreated extends Notification
{
    public function __construct(
        public readonly string $schoolName,
        public readonly string $domain,
        public readonly string $loginUrl,
        public readonly string $plainPassword,
        public readonly string $roleLabel,
        public readonly bool $isResend = false,
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
        $subject = $this->isResend
            ? "Nouveaux identifiants YouSch - {$this->schoolName}"
            : "Votre accès YouSch - {$this->schoolName}";

        return (new MailMessage)
            ->subject($subject)
            ->markdown('mail.staff-account-created', [
                'name' => $notifiable->name,
                'email' => $notifiable->email,
                'schoolName' => $this->schoolName,
                'domain' => $this->domain,
                'loginUrl' => $this->loginUrl,
                'plainPassword' => $this->plainPassword,
                'roleLabel' => $this->roleLabel,
                'isResend' => $this->isResend,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'schoolName' => $this->schoolName,
            'domain' => $this->domain,
            'loginUrl' => $this->loginUrl,
            'roleLabel' => $this->roleLabel,
            'isResend' => $this->isResend,
        ];
    }
}
