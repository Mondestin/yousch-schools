<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\School;
use App\Support\Billing\FeeReminderNotifier;
use App\Support\School\SchoolClock;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Console\Command;

class SendFeeRemindersCommand extends Command
{
    protected $signature = 'school:fee-reminders';

    protected $description = 'Envoie les relances e-mail hebdomadaires pour les frais scolaires en retard';

    public function handle(FeeReminderNotifier $notifier): int
    {
        $today = SchoolClock::today();
        $cooldown = SchoolClock::now()->subDays(7);
        $sent = 0;
        $skipped = 0;

        foreach (School::query()->cursor() as $school) {
            CurrentSchool::set($school);

            $payments = Payment::query()
                ->with(['enrollment.student.guardians', 'enrollment.classroom'])
                ->whereIn('status', [
                    PaymentStatus::Impaye->value,
                    PaymentStatus::Partiel->value,
                ])
                ->whereColumn('amount', '<', 'expected_amount')
                ->where(function ($query) use ($cooldown): void {
                    $query->whereNull('last_reminded_at')
                        ->orWhere('last_reminded_at', '<=', $cooldown);
                })
                ->get()
                ->filter(function (Payment $payment) use ($today): bool {
                    try {
                        $dueOn = \Illuminate\Support\Carbon::createFromFormat('Y-m', $payment->month)
                            ->endOfMonth()
                            ->toDateString();
                    } catch (\Throwable) {
                        return false;
                    }

                    return $today > $dueOn;
                })
                ->values()
                ->all();

            if ($payments === []) {
                CurrentSchool::clear();

                continue;
            }

            $result = $notifier->send($payments);
            $sent += $result['sent'];
            $skipped += $result['skipped'];

            CurrentSchool::clear();
        }

        $this->info("Relances envoyées : {$sent} · ignorées : {$skipped}");

        return self::SUCCESS;
    }
}
