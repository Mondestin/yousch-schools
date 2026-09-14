<?php

namespace App\Support\Billing;

use App\Enums\PaymentStatus;
use App\Models\Guardian;
use App\Models\Payment;
use App\Models\School;
use App\Models\User;
use App\Notifications\FeeReminderNotification;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

final class FeeReminderNotifier
{
    public function __construct(
        private readonly FeeStatementPdfBuilder $pdfBuilder = new FeeStatementPdfBuilder,
    ) {}

    /**
     * @param  list<Payment>  $payments
     * @return array{sent: int, skipped: int, failures: list<string>}
     */
    public function send(array $payments, ?string $customMessage = null): array
    {
        $school = CurrentSchool::get() ?? School::query()->first();
        $school?->loadMissing('profile');
        $schoolName = $school?->profile?->name ?? $school?->name ?? 'YouSch';
        $schoolPhone = $school?->profile?->phone;
        $message = is_string($customMessage) ? trim($customMessage) : '';
        $message = $message !== '' ? $message : null;

        $sent = 0;
        $skipped = 0;
        /** @var list<string> $failures */
        $failures = [];

        foreach ($payments as $payment) {
            if (! in_array($payment->status, [PaymentStatus::Impaye, PaymentStatus::Partiel], true)) {
                $skipped++;

                continue;
            }

            $due = max(0, $payment->expected_amount - $payment->amount);

            if ($due <= 0) {
                $skipped++;

                continue;
            }

            $payment->loadMissing(['enrollment.student.guardians', 'enrollment.classroom']);
            $enrollment = $payment->enrollment;

            if ($enrollment === null || $enrollment->student === null) {
                $skipped++;
                $failures[] = "Paiement {$payment->id} : inscription introuvable.";

                continue;
            }

            $student = $enrollment->student;
            $studentName = trim($student->first_name.' '.$student->last_name);
            $classroomName = $enrollment->classroom?->name ?? '-';
            $recipient = $this->resolveRecipient($student->guardians);

            if ($recipient === null) {
                $skipped++;
                $failures[] = "{$studentName} : aucun e-mail tuteur.";

                continue;
            }

            try {
                $pdf = $this->pdfBuilder->forPayment($payment);
                $paymentUrl = FeePaymentLink::temporaryUrl($payment);

                $notification = new FeeReminderNotification(
                    payment: $payment,
                    studentName: $studentName,
                    classroomName: $classroomName,
                    monthLabel: $this->monthLabel($payment->month),
                    schoolName: $schoolName,
                    dueAmount: $due,
                    customMessage: $message,
                    paymentUrl: $paymentUrl,
                    pdfBinary: $pdf,
                    schoolPhone: filled($schoolPhone) ? (string) $schoolPhone : null,
                );

                if ($recipient instanceof User) {
                    $recipient->notify($notification);
                } else {
                    Notification::route('mail', [
                        $recipient['email'] => $recipient['name'],
                    ])->notify($notification);
                }

                $payment->forceFill(['last_reminded_at' => now()])->save();
                $sent++;
            } catch (\Throwable $exception) {
                $skipped++;
                $failures[] = "{$studentName} : envoi impossible.";
                report($exception);
            }
        }

        return [
            'sent' => $sent,
            'skipped' => $skipped,
            'failures' => array_slice($failures, 0, 20),
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Guardian>  $guardians
     * @return User|array{email: string, name: string}|null
     */
    public function resolveRecipient($guardians): User|array|null
    {
        foreach ($guardians as $guardian) {
            if ($guardian->user_id !== null) {
                $user = User::query()->find($guardian->user_id);

                if ($user !== null && filled($user->email)) {
                    return $user;
                }
            }

            $email = is_string($guardian->email) ? trim($guardian->email) : '';

            if ($email !== '') {
                return [
                    'email' => $email,
                    'name' => trim($guardian->first_name.' '.$guardian->last_name) ?: 'Parent / tuteur',
                ];
            }
        }

        return null;
    }

    private function monthLabel(string $month): string
    {
        try {
            return Carbon::createFromFormat('Y-m', $month)
                ->locale('fr')
                ->translatedFormat('F Y');
        } catch (\Throwable) {
            return $month;
        }
    }
}
