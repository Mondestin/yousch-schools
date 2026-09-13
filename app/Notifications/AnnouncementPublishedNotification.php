<?php

namespace App\Notifications;

use App\Enums\AnnouncementAudience;
use App\Models\Announcement;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AnnouncementPublishedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Announcement $announcement,
        public readonly string $kind,
        public readonly string $schoolName,
        public readonly string $announcementsUrl,
    ) {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $audience = match ($this->announcement->audience) {
            AnnouncementAudience::Personnel => 'Personnel',
            AnnouncementAudience::Tous => 'Tout public',
            AnnouncementAudience::Parents => 'Parents',
            AnnouncementAudience::Eleves => 'Élèves',
            default => $this->announcement->audience->value,
        };

        $publishedOn = $this->announcement->published_on->format('d/m/Y');
        $expiresOn = $this->announcement->expires_on?->format('d/m/Y');

        [$subject, $headline] = match ($this->kind) {
            'updated' => [
                "Annonce mise à jour - {$this->schoolName} - {$this->announcement->title}",
                'Une annonce a été mise à jour',
            ],
            default => [
                "Nouvelle annonce - {$this->schoolName} - {$this->announcement->title}",
                'Nouvelle annonce de l’établissement',
            ],
        };

        return (new MailMessage)
            ->subject($subject)
            ->markdown('mail.announcement-published', [
                'name' => $notifiable->name,
                'schoolName' => $this->schoolName,
                'headline' => $headline,
                'title' => $this->announcement->title,
                'body' => $this->announcement->body,
                'audience' => $audience,
                'publishedOn' => $publishedOn,
                'expiresOn' => $expiresOn,
                'announcementsUrl' => $this->announcementsUrl,
                'kind' => $this->kind,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'announcementId' => $this->announcement->id,
            'kind' => $this->kind,
            'audience' => $this->announcement->audience->value,
            'schoolName' => $this->schoolName,
        ];
    }
}
