<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Support\Billing\FeeStatementPdfBuilder;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class FeePaymentLinkController extends Controller
{
    public function show(
        Request $request,
        string $payment,
        FeeStatementPdfBuilder $builder,
    ): InertiaResponse|Response {
        $model = $this->resolvePayment($payment);

        if ($request->query('download') === 'pdf') {
            return $this->pdfResponse($model, $builder);
        }

        $due = max(0, $model->expected_amount - $model->amount);
        $profile = $model->school?->profile;
        $student = $model->enrollment?->student;
        $classroom = $model->enrollment?->classroom;

        return Inertia::render('fees/pay', [
            'payment' => [
                'id' => $model->id,
                'month' => $model->month,
                'monthLabel' => $this->monthLabel($model->month),
                'amount' => $model->amount,
                'expectedAmount' => $model->expected_amount,
                'dueAmount' => $due,
                'status' => $model->status->value,
                'statusLabel' => $model->status->label(),
            ],
            'student' => [
                'name' => trim(($student?->first_name ?? '').' '.($student?->last_name ?? '')),
                'matricule' => $student?->matricule ?? '-',
                'classroom' => $classroom?->name ?? '-',
            ],
            'school' => [
                'name' => $profile?->name ?? $model->school?->name ?? 'Établissement',
                'phone' => $profile?->phone ?? '',
                'email' => $profile?->email ?? '',
                'address' => $profile?->address ?? '',
                'city' => $profile?->city ?? '',
            ],
            'pdfUrl' => $request->fullUrlWithQuery([
                ...$request->query(),
                'download' => 'pdf',
            ]),
        ]);
    }

    private function pdfResponse(Payment $model, FeeStatementPdfBuilder $builder): Response
    {
        $bytes = $builder->forPayment($model);
        $filename = 'releve-'.$model->id.'.pdf';

        return response($bytes, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    private function resolvePayment(string $paymentId): Payment
    {
        /** @var Payment $payment */
        $payment = Payment::query()
            ->withoutGlobalScope(SchoolScope::class)
            ->with([
                'enrollment.student',
                'enrollment.classroom',
                'school.profile',
            ])
            ->findOrFail($paymentId);

        $school = $payment->school ?? School::query()->find($payment->school_id);

        if ($school !== null) {
            CurrentSchool::set($school);
        }

        return $payment;
    }

    private function monthLabel(string $month): string
    {
        try {
            return \Illuminate\Support\Carbon::createFromFormat('Y-m', $month)
                ->locale('fr')
                ->translatedFormat('F Y');
        } catch (\Throwable) {
            return $month;
        }
    }
}
