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
            ? "Nouveaux identifiants Yousch - {$this->schoolName}"
            : "Votre accès Yousch - {$this->schoolName}";

        $intro = $this->isResend
            ? "Vos identifiants pour **{$this->schoolName}** ({$this->roleLabel}) ont été renouvelés."
            : "Un compte a été créé pour vous sur **{$this->schoolName}** ({$this->roleLabel}).";

        return (new MailMessage)
            ->subject($subject)
            ->greeting('Bonjour '.$notifiable->name.',')
            ->line($intro)
            ->line('Voici vos informations de connexion :')
            ->line("**Établissement (domaine)** : {$this->domain}")
            ->line("**E-mail** : {$notifiable->email}")
            ->line("**Mot de passe temporaire** : {$this->plainPassword}")
            ->action('Se connecter à mon établissement', $this->loginUrl)
            ->line('Ce bouton ouvre directement la page de connexion de votre établissement (domaine déjà sélectionné).')
            ->line('Pour votre sécurité, changez ce mot de passe dès la première connexion (Paramètres → Sécurité).')
            ->salutation('L’équipe Yousch');
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
