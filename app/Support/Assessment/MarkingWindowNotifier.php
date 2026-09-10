<?php

namespace App\Support\Assessment;

use App\Enums\StaffRole;
use App\Models\MarkingWindow;
use App\Models\Teacher;
use App\Models\User;
use App\Notifications\MarkingWindowNotification;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Collection;

final class MarkingWindowNotifier
{
    public function notifyTeachers(MarkingWindow $window, string $kind): int
    {
        $recipients = $this->teacherUsers();
        $count = 0;

        foreach ($recipients as $user) {
            $user->notify(new MarkingWindowNotification($window, $kind));
            $count++;
        }

        return $count;
    }

    /**
     * @return Collection<int, User>
     */
    private function teacherUsers(): Collection
    {
        $schoolId = CurrentSchool::id();

        $byRole = User::query()
            ->when($schoolId !== null, fn ($q) => $q->where('school_id', $schoolId))
            ->where('role', StaffRole::Enseignant)
            ->get()
            ->keyBy('id');

        $teacherEmails = Teacher::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->pluck('email')
            ->map(static fn (string $email): string => mb_strtolower($email))
            ->unique()
            ->values()
            ->all();

        if ($teacherEmails !== []) {
            User::query()
                ->when($schoolId !== null, fn ($q) => $q->where('school_id', $schoolId))
                ->whereIn('email', $teacherEmails)
                ->get()
                ->each(function (User $user) use ($byRole): void {
                    $byRole->put($user->id, $user);
                });
        }

        return $byRole->values();
    }
}
