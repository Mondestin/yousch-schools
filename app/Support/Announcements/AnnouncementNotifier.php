<?php

namespace App\Support\Announcements;

use App\Enums\AnnouncementAudience;
use App\Models\Announcement;
use App\Models\School;
use App\Models\User;
use App\Notifications\AnnouncementPublishedNotification;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

final class AnnouncementNotifier
{
    /**
     * Email school staff for personnel / tous announcements that are already published.
     *
     * @param  array{title?: string, body?: string, audience?: string}|null  $previous
     */
    public function notifyStaff(
        Announcement $announcement,
        string $kind,
        ?array $previous = null,
    ): int {
        if (! in_array($announcement->audience, [
            AnnouncementAudience::Personnel,
            AnnouncementAudience::Tous,
        ], true)) {
            return 0;
        }

        if ($announcement->published_on->toDateString() > now()->toDateString()) {
            return 0;
        }

        if ($kind === 'updated' && $previous !== null && ! $this->contentChanged($announcement, $previous)) {
            return 0;
        }

        $users = $this->staffUsers($announcement);

        if ($users->isEmpty()) {
            return 0;
        }

        [$schoolName, $announcementsUrl] = $this->schoolContext($announcement);

        Notification::send(
            $users,
            new AnnouncementPublishedNotification(
                announcement: $announcement,
                kind: $kind,
                schoolName: $schoolName,
                announcementsUrl: $announcementsUrl,
            ),
        );

        return $users->count();
    }

    /**
     * @param  array{title?: string, body?: string, audience?: string}  $previous
     */
    private function contentChanged(Announcement $announcement, array $previous): bool
    {
        return ($previous['title'] ?? null) !== $announcement->title
            || ($previous['body'] ?? null) !== $announcement->body
            || ($previous['audience'] ?? null) !== $announcement->audience->value;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function schoolContext(Announcement $announcement): array
    {
        $school = CurrentSchool::get()
            ?? School::query()->find($announcement->school_id);

        $school?->loadMissing('profile');

        $schoolName = $school?->profile?->name
            ?? $school?->name
            ?? config('app.name', 'YouSch');

        return [
            $schoolName,
            route('announcements.index', absolute: true),
        ];
    }

    /**
     * @return Collection<int, User>
     */
    private function staffUsers(Announcement $announcement): Collection
    {
        $schoolId = CurrentSchool::id() ?? $announcement->school_id;

        return User::query()
            ->when($schoolId !== null, fn ($query) => $query->where('school_id', $schoolId))
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->whereNull('blocked_at')
            ->orderBy('name')
            ->get();
    }
}
