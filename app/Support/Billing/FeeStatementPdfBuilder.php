<?php

namespace App\Support\Billing;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Support\School\PaymentReceiptBuilder;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Carbon;

final class FeeStatementPdfBuilder
{
    public function __construct(
        private readonly PaymentReceiptBuilder $receipts = new PaymentReceiptBuilder,
    ) {}

    public function forPayment(Payment $payment): string
    {
        $payment->loadMissing(['enrollment.student', 'enrollment.classroom']);
        $enrollment = $payment->enrollment;
        $studentId = $enrollment?->student_id;
        $yearId = $enrollment?->academic_year_id;

        if ($studentId === null || $yearId === null) {
            return $this->renderFallback($payment);
        }

        $fiche = $this->receipts->forStudent($studentId, $yearId);

        if ($fiche === null) {
            return $this->renderFallback($payment);
        }

        /** @var array<string, mixed> $profile */
        $profile = is_array($fiche['profile'] ?? null) ? $fiche['profile'] : [];
        /** @var array<string, mixed> $student */
        $student = is_array($fiche['student'] ?? null) ? $fiche['student'] : [];

        $lines = [];

        foreach ($fiche['lines'] as $line) {
            if (! is_array($line)) {
                continue;
            }

            $status = is_string($line['status'] ?? null)
                ? PaymentStatus::tryFrom($line['status'])
                : null;

            $lines[] = [
                'monthLabel' => (string) ($line['monthLabel'] ?? $line['month'] ?? ''),
                'amountLabel' => $this->fcfa((int) ($line['amount'] ?? 0)),
                'remainingLabel' => $this->fcfa((int) ($line['remaining'] ?? 0)),
                'statusLabel' => $status?->label() ?? (string) ($line['status'] ?? ''),
            ];
        }

        $html = view('pdf.fee-statement', [
            'profile' => $profile,
            'logoSrc' => $this->imageSrc(is_string($profile['logoUrl'] ?? null) ? $profile['logoUrl'] : null),
            'stampSrc' => $this->imageSrc(is_string($profile['stampUrl'] ?? null) ? $profile['stampUrl'] : null),
            'countryName' => 'République du Congo',
            'countryShort' => 'Rép. du Congo',
            'countryMotto' => 'Unité * Travail * Progrès',
            'yearLabel' => (string) ($fiche['yearLabel'] ?? ''),
            'matricule' => (string) ($student['matricule'] ?? '-'),
            'classroomName' => (string) ($fiche['classroomName'] ?? '-'),
            'trackCode' => $fiche['trackCode'] ?? null,
            'studentName' => trim(
                (string) ($student['lastName'] ?? '').' '.(string) ($student['firstName'] ?? ''),
            ) ?: (string) ($fiche['name'] ?? ''),
            'lines' => $lines,
            'expectedTotalLabel' => $this->fcfa((int) ($fiche['expectedTotal'] ?? 0)),
            'paidTotalLabel' => $this->fcfa((int) ($fiche['paidTotal'] ?? 0)),
            'unpaidTotalLabel' => $this->fcfa((int) ($fiche['unpaidTotal'] ?? 0)),
            'issuedOn' => (string) ($fiche['issuedOn'] ?? now()->locale('fr')->translatedFormat('j F Y')),
            'directorName' => (string) ($profile['directorName'] ?? ''),
        ])->render();

        return $this->dompdf($html);
    }

    private function renderFallback(Payment $payment): string
    {
        $due = max(0, $payment->expected_amount - $payment->amount);
        $html = view('pdf.fee-statement', [
            'profile' => [
                'name' => 'Établissement',
                'phone' => '',
                'email' => '',
                'address' => '',
                'city' => '',
            ],
            'logoSrc' => null,
            'stampSrc' => null,
            'countryName' => 'République du Congo',
            'countryShort' => 'Rép. du Congo',
            'countryMotto' => 'Unité * Travail * Progrès',
            'yearLabel' => '-',
            'matricule' => '-',
            'classroomName' => '-',
            'trackCode' => null,
            'studentName' => '-',
            'lines' => [[
                'monthLabel' => $this->monthLabel($payment->month),
                'amountLabel' => $this->fcfa($payment->amount),
                'remainingLabel' => $this->fcfa($due),
                'statusLabel' => $payment->status->label(),
            ]],
            'expectedTotalLabel' => $this->fcfa($payment->expected_amount),
            'paidTotalLabel' => $this->fcfa($payment->amount),
            'unpaidTotalLabel' => $this->fcfa($due),
            'issuedOn' => now()->locale('fr')->translatedFormat('j F Y'),
            'directorName' => '',
        ])->render();

        return $this->dompdf($html);
    }

    private function dompdf(string $html): string
    {
        $options = new Options;
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->setChroot(public_path());
        $options->setDefaultFont('DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output() ?? '';
    }

    private function fcfa(int $amount): string
    {
        return number_format($amount, 0, ',', ' ').' FCFA';
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

    private function imageSrc(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        if (str_starts_with($url, 'data:')) {
            return $url;
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        $path = public_path(ltrim(parse_url($url, PHP_URL_PATH) ?: $url, '/'));

        if (is_file($path)) {
            $mime = mime_content_type($path) ?: 'image/png';
            $data = base64_encode((string) file_get_contents($path));

            return 'data:'.$mime.';base64,'.$data;
        }

        return $url;
    }
}
