<?php

namespace App\Console\Commands;

use App\Models\MarkingWindow;
use App\Models\School;
use App\Support\Assessment\MarkingWindowNotifier;
use App\Support\School\SchoolClock;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Console\Command;

class SendMarkingWindowRemindersCommand extends Command
{
    protected $signature = 'school:marking-window-reminders';

    protected $description = 'Envoie les notifications d’ouverture et de rappel de clôture des fenêtres de saisie';

    public function handle(MarkingWindowNotifier $notifier): int
    {
        $today = SchoolClock::today();
        $closingSoon = SchoolClock::now()->addDays(2)->toDateString();
        $sent = 0;

        foreach (School::query()->cursor() as $school) {
            CurrentSchool::set($school);

            $opened = MarkingWindow::query()
                ->whereDate('opens_on', $today)
                ->whereNull('opened_notified_at')
                ->get();

            foreach ($opened as $window) {
                $notifier->notifyTeachers($window, 'opened');
                $window->update(['opened_notified_at' => SchoolClock::now()]);
                $sent++;
            }

            $reminders = MarkingWindow::query()
                ->whereDate('closes_on', $closingSoon)
                ->whereNull('closing_reminder_sent_at')
                ->whereNull('closed_at')
                ->get();

            foreach ($reminders as $window) {
                $notifier->notifyTeachers($window, 'closing_soon');
                $window->update(['closing_reminder_sent_at' => SchoolClock::now()]);
                $sent++;
            }

            CurrentSchool::clear();
        }

        $this->info("Notifications envoyées : {$sent}");

        return self::SUCCESS;
    }
}
