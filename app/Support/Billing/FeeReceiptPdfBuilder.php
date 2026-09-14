<?php

namespace App\Support\Billing;

use App\Enums\PaymentMethod;
use App\Models\Payment;
use App\Support\School\PaymentReceiptBuilder;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Carbon;

final class FeeReceiptPdfBuilder
{
    public function __construct(
        private readonly PaymentReceiptBuilder $receipts = new PaymentReceiptBuilder,
    ) {}

    public function forPayment(Payment $payment): string
    {
        $payment->loadMissing(['enrollment.student', 'enrollment.classroom']);
        $enrollment = $payment->enrollment;
        $student = $enrollment?->student;
        $studentId = $enrollment?->student_id;
        $yearId = $enrollment?->academic_year_id;

        $fiche = ($studentId !== null && $yearId !== null)
            ? $this->receipts->forStudent($studentId, $yearId)
            : null;

        /** @var array<string, mixed> $profile */
        $profile = is_array($fiche['profile'] ?? null)
            ? $fiche['profile']
            : [
                'name' => 'Établissement',
                'phone' => '',
                'email' => '',
                'address' => '',
                'city' => '',
                'directorName' => '',
                'logoUrl' => null,
                'stampUrl' => null,
            ];

        $studentName = $fiche['name']
            ?? trim(($student?->first_name ?? '').' '.($student?->last_name ?? ''))
            ?: '-';

        $methodLabel = match ($payment->method) {
            PaymentMethod::Especes => 'Espèces',
            PaymentMethod::MtnMoney => 'MTN Mobile Money',
            PaymentMethod::AirtelMoney => 'Airtel Money',
            PaymentMethod::MobileMoney => 'Mobile money',
            PaymentMethod::Virement => 'Virement',
            default => null,
        };

        $paidOn = $payment->paid_on?->locale('fr')->translatedFormat('j F Y')
            ?? (string) ($fiche['issuedOn'] ?? now()->locale('fr')->translatedFormat('j F Y'));

        $html = view('pdf.fee-receipt', [
            'profile' => $profile,
            'logoSrc' => $this->imageSrc(is_string($profile['logoUrl'] ?? null) ? $profile['logoUrl'] : null),
            'stampSrc' => $this->imageSrc(is_string($profile['stampUrl'] ?? null) ? $profile['stampUrl'] : null),
            'countryShort' => 'Rép. du Congo',
            'studentName' => $studentName,
            'matricule' => $student?->matricule ?? '-',
            'classroomName' => (string) ($fiche['classroomName'] ?? $enrollment?->classroom?->name ?? '-'),
            'monthLabel' => $this->monthLabel($payment->month),
            'amountLabel' => $this->fcfa($payment->amount),
            'expectedLabel' => $this->fcfa($payment->expected_amount),
            'statusLabel' => $payment->status->label(),
            'paidOnLabel' => $paidOn,
            'methodLabel' => $methodLabel,
            'issuedOn' => (string) ($fiche['issuedOn'] ?? now()->locale('fr')->translatedFormat('j F Y')),
            'directorName' => (string) ($profile['directorName'] ?? ''),
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
