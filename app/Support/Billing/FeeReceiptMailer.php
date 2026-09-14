<?php

namespace App\Support\Billing;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\School;
use App\Models\User;
use App\Notifications\PaymentReceiptMailNotification;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

final class FeeReceiptMailer
{
    public function __construct(
        private readonly FeeReceiptPdfBuilder $pdfBuilder = new FeeReceiptPdfBuilder,
        private readonly FeeReminderNotifier $recipients = new FeeReminderNotifier,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function send(Payment $payment): array
    {
        if ($payment->status === PaymentStatus::Impaye || $payment->amount <= 0) {
            return [
                'ok' => false,
                'message' => 'Aucun encaissement à envoyer pour ce mois.',
            ];
        }

        $school = CurrentSchool::get() ?? School::query()->first();
        $school?->loadMissing('profile');
        $schoolName = $school?->profile?->name ?? $school?->name ?? 'YouSch';

        $payment->loadMissing(['enrollment.student.guardians', 'enrollment.classroom']);
        $enrollment = $payment->enrollment;
        $student = $enrollment?->student;

        if ($enrollment === null || $student === null) {
            return [
                'ok' => false,
                'message' => 'Inscription introuvable pour ce reçu.',
            ];
        }

        $studentName = trim($student->first_name.' '.$student->last_name);
        $classroomName = $enrollment->classroom?->name ?? '-';
        $recipient = $this->recipients->resolveRecipient($student->guardians);

        if ($recipient === null) {
            return [
                'ok' => false,
                'message' => "{$studentName} : aucun e-mail tuteur.",
            ];
        }

        try {
            $notification = new PaymentReceiptMailNotification(
                payment: $payment,
                studentName: $studentName,
                classroomName: $classroomName,
                monthLabel: $this->monthLabel($payment->month),
                schoolName: $schoolName,
                amount: $payment->amount,
                pdfBinary: $this->pdfBuilder->forPayment($payment),
            );

            if ($recipient instanceof User) {
                $recipient->notify($notification);
            } else {
                Notification::route('mail', [
                    $recipient['email'] => $recipient['name'],
                ])->notify($notification);
            }

            return [
                'ok' => true,
                'message' => "Reçu envoyé à {$this->recipientEmail($recipient)}.",
            ];
        } catch (\Throwable $exception) {
            report($exception);

            return [
                'ok' => false,
                'message' => 'Impossible d’envoyer le reçu par e-mail.',
            ];
        }
    }

    private function recipientEmail(User|array $recipient): string
    {
        if ($recipient instanceof User) {
            return (string) $recipient->email;
        }

        return $recipient['email'];
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
