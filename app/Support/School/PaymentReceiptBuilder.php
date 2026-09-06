<?php

namespace App\Support\School;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Track;
use App\Support\SchoolCatalog;
use Carbon\Carbon;

/**
 * Receipt payload aligned with resources/js/lib/school-payments.ts receiptFiche.
 */
final class PaymentReceiptBuilder
{
    private const ANNUAL_FEE_MONTHS = 12;

    /**
     * @return array<string, mixed>|null
     */
    public function forStudent(string $studentId, string $academicYearId): ?array
    {
        $student = Student::query()->find($studentId);

        if ($student === null) {
            return null;
        }

        $enrollment = Enrollment::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->first()
            ?? Enrollment::query()->where('student_id', $studentId)->first();

        if ($enrollment === null) {
            return null;
        }

        $classroom = Classroom::query()->find($enrollment->classroom_id);
        $year = AcademicYear::query()->find($enrollment->academic_year_id);
        $track = $enrollment->track_id !== null
            ? Track::query()->find($enrollment->track_id)
            : null;
        $monthly = $classroom !== null ? TuitionFee::monthlyExpectedForEnrollment($enrollment) : 0;
        $months = $year !== null ? $this->academicYearMonths($year) : [];
        $posted = Payment::query()
            ->where('enrollment_id', $enrollment->id)
            ->get()
            ->keyBy('month');

        $lines = collect($months)->map(function (string $month) use ($enrollment, $posted, $monthly): array {
            $payment = $posted->get($month);

            if ($payment instanceof Payment) {
                return [
                    'id' => $payment->id,
                    'enrollmentId' => $enrollment->id,
                    'month' => $month,
                    'amount' => $payment->amount,
                    'expectedAmount' => $payment->expected_amount,
                    'remaining' => max(0, $payment->expected_amount - $payment->amount),
                    'status' => $payment->status->value,
                    'paidOn' => $payment->paid_on?->format('Y-m-d'),
                    'method' => $payment->method?->value,
                    'monthLabel' => $this->formatFrMonth($month),
                    'posted' => true,
                ];
            }

            $expectedAmount = $monthly;

            return [
                'id' => 'due-'.$enrollment->id.'-'.$month,
                'enrollmentId' => $enrollment->id,
                'month' => $month,
                'amount' => 0,
                'expectedAmount' => $expectedAmount,
                'remaining' => max(0, $expectedAmount),
                'status' => TuitionFee::statusFromAmount(0, $expectedAmount)->value,
                'paidOn' => null,
                'method' => null,
                'monthLabel' => $this->formatFrMonth($month),
                'posted' => false,
            ];
        })->values()->all();

        $paidTotal = Payment::query()
            ->where('enrollment_id', $enrollment->id)
            ->sum('amount');

        $profile = SchoolProfile::query()->first();
        $issuedOn = now();
        $issuedOn->locale('fr');

        return [
            'student' => $student->toApiArray(),
            'enrollment' => $enrollment->toApiArray(),
            'classroom' => $classroom?->toApiArray(),
            'year' => $year?->toApiArray(),
            'track' => $track?->toApiArray(),
            'name' => trim($student->first_name.' '.$student->last_name),
            'classroomName' => $classroom !== null ? $classroom->name : '—',
            'yearLabel' => $year !== null ? $year->label : '—',
            'trackCode' => $track?->code,
            'lines' => $lines,
            'monthlyAmount' => $monthly,
            'expectedTotal' => $monthly * self::ANNUAL_FEE_MONTHS,
            'paidTotal' => (int) $paidTotal,
            'unpaidTotal' => max(0, ($monthly * self::ANNUAL_FEE_MONTHS) - (int) $paidTotal),
            'profile' => $profile?->toApiArray() ?? SchoolCatalog::fixture()['profile'],
            'issuedOn' => $issuedOn->translatedFormat('j F Y'),
        ];
    }

    /**
     * @return list<string>
     */
    private function academicYearMonths(AcademicYear $year): array
    {
        $start = Carbon::parse($year->starts_on)->startOfMonth();
        $months = [];

        for ($i = 0; $i < self::ANNUAL_FEE_MONTHS; $i++) {
            $months[] = $start->copy()->addMonths($i)->format('Y-m');
        }

        return $months;
    }

    private function formatFrMonth(string $month): string
    {
        $date = Carbon::parse($month.'-01');
        $date->locale('fr');

        return $date->translatedFormat('F Y');
    }
}
