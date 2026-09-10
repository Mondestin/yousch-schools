<?php

namespace App\Notifications;

use App\Models\MarkingWindow;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MarkingWindowNotification extends Notification
{
    public function __construct(
        public readonly MarkingWindow $window,
        public readonly string $kind,
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
        $typeLabel = match ($this->window->type->value) {
            'devoir' => 'devoirs',
            'composition' => 'compositions',
            'examen' => 'examens',
            default => $this->window->type->value,
        };

        $opensOn = $this->window->opens_on->format('d/m/Y');
        $closesOn = $this->window->closes_on->format('d/m/Y');

        [$subject, $headline, $body] = match ($this->kind) {
            'opened' => [
                "Saisie ouverte - {$typeLabel}",
                'La saisie des notes est ouverte',
                "La période de saisie des notes de {$typeLabel} est ouverte du {$opensOn} au {$closesOn}.",
            ],
            'closing_soon' => [
                "Rappel - clôture saisie {$typeLabel}",
                'La saisie se termine bientôt',
                "Rappel : la saisie des notes de {$typeLabel} se termine le {$closesOn}. Veuillez finaliser vos notes.",
            ],
            default => [
                "Information saisie - {$typeLabel}",
                'Information sur la saisie des notes',
                "Information concernant la saisie des notes de {$typeLabel} (du {$opensOn} au {$closesOn}).",
            ],
        };

        return (new MailMessage)
            ->subject($subject)
            ->markdown('mail.marking-window', [
                'name' => $notifiable->name,
                'headline' => $headline,
                'body' => $body,
                'typeLabel' => $typeLabel,
                'opensOn' => $opensOn,
                'closesOn' => $closesOn,
                'kind' => $this->kind,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'windowId' => $this->window->id,
            'kind' => $this->kind,
            'type' => $this->window->type->value,
        ];
    }
}
