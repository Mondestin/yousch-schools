<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Billing\FeeReceiptMailer;
use App\Support\Billing\FeeReminderNotifier;
use App\Support\School\PaymentReceiptBuilder;
use App\Support\School\TuitionFee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    use EnsuresStaffAbility;

    public function __construct(private PaymentReceiptBuilder $receipts) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $query = Payment::query()->orderByDesc('month')->orderBy('enrollment_id');

        if ($request->filled('enrollmentId')) {
            $query->where('enrollment_id', $request->string('enrollmentId'));
        }

        if ($request->filled('month')) {
            $query->where('month', $request->string('month'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function show(Request $request, string $payment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $model = Payment::query()->findOrFail($payment);

        return response()->json(['data' => $model->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $validated = $this->validatedPayment($request);
        $enrollment = Enrollment::query()->findOrFail($validated['enrollmentId']);
        $expected = $validated['expectedAmount']
            ?? TuitionFee::monthlyExpectedForEnrollment($enrollment);
        $amount = (int) $validated['amount'];
        $status = TuitionFee::statusFromAmount($amount, $expected);

        $payment = Payment::query()->create([
            'id' => ResourceId::make('py'),
            'enrollment_id' => $validated['enrollmentId'],
            'month' => $validated['month'],
            'amount' => $amount,
            'expected_amount' => $expected,
            'status' => $status->value,
            'paid_on' => $amount > 0 ? ($validated['paidOn'] ?? now()->toDateString()) : null,
            'method' => $amount > 0 ? ($validated['method'] ?? null) : null,
        ]);

        return response()->json(['data' => $payment->toApiArray()], 201);
    }

    public function remind(Request $request, FeeReminderNotifier $notifier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.enrollmentId' => ['required', 'string', 'exists:enrollments,id'],
            'items.*.month' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'message' => ['nullable', 'string', 'max:2000'],
        ], [
            'items.required' => 'Sélectionnez au moins une ligne à relancer.',
            'items.min' => 'Sélectionnez au moins une ligne à relancer.',
        ]);

        /** @var list<Payment> $payments */
        $payments = [];

        foreach ($validated['items'] as $item) {
            $enrollment = Enrollment::query()->findOrFail($item['enrollmentId']);
            $expected = TuitionFee::monthlyExpectedForEnrollment($enrollment);

            $payment = Payment::query()->firstOrCreate(
                [
                    'enrollment_id' => $enrollment->id,
                    'month' => $item['month'],
                ],
                [
                    'id' => ResourceId::make('py'),
                    'amount' => 0,
                    'expected_amount' => $expected,
                    'status' => PaymentStatus::Impaye->value,
                    'paid_on' => null,
                    'method' => null,
                ],
            );

            if ($payment->expected_amount <= 0 && $expected > 0) {
                $payment->forceFill(['expected_amount' => $expected])->save();
            }

            if ($payment->status === PaymentStatus::Paye) {
                continue;
            }

            $payments[] = $payment->fresh();
        }

        $result = $notifier->send(
            $payments,
            is_string($validated['message'] ?? null) ? $validated['message'] : null,
        );

        return response()->json([
            'data' => [
                ...$result,
                'payments' => collect($payments)->map->toApiArray()->values()->all(),
            ],
            'message' => sprintf(
                '%d relance%s envoyée%s · %d ignorée%s.',
                $result['sent'],
                $result['sent'] > 1 ? 's' : '',
                $result['sent'] > 1 ? 's' : '',
                $result['skipped'],
                $result['skipped'] > 1 ? 's' : '',
            ),
        ]);
    }

    public function emailReceipt(Request $request, string $payment, FeeReceiptMailer $mailer): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $model = Payment::query()->findOrFail($payment);
        $result = $mailer->send($model);

        return response()->json([
            'data' => [
                'ok' => $result['ok'],
            ],
            'message' => $result['message'],
        ], $result['ok'] ? 200 : 422);
    }

    public function update(Request $request, string $payment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $model = Payment::query()->findOrFail($payment);
        $validated = $this->validatedPayment($request, $model);
        $enrollment = Enrollment::query()->findOrFail($validated['enrollmentId']);
        $expected = $validated['expectedAmount']
            ?? TuitionFee::monthlyExpectedForEnrollment($enrollment);
        $amount = (int) $validated['amount'];
        $status = TuitionFee::statusFromAmount($amount, $expected);

        $model->update([
            'enrollment_id' => $validated['enrollmentId'],
            'month' => $validated['month'],
            'amount' => $amount,
            'expected_amount' => $expected,
            'status' => $status->value,
            'paid_on' => $amount > 0 ? ($validated['paidOn'] ?? $model->paid_on?->format('Y-m-d') ?? now()->toDateString()) : null,
            'method' => $amount > 0 ? ($validated['method'] ?? $model->method?->value) : null,
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $payment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        Payment::query()->findOrFail($payment)->delete();

        return response()->json(['message' => 'Paiement supprimé.']);
    }

    public function receipt(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'cash')) {
            return $denied;
        }

        $validated = $request->validate([
            'academicYearId' => ['required', 'string', 'exists:academic_years,id'],
        ], [
            'academicYearId.required' => 'L’année scolaire est obligatoire.',
        ]);

        $receipt = $this->receipts->forStudent($student, $validated['academicYearId']);

        if ($receipt === null) {
            return response()->json(['message' => 'Reçu introuvable pour cet élève.'], 404);
        }

        return response()->json(['data' => $receipt]);
    }

    /**
     * @return array{
     *     enrollmentId: string,
     *     month: string,
     *     amount: int,
     *     expectedAmount?: int|null,
     *     paidOn?: string|null,
     *     method?: string|null
     * }
     */
    private function validatedPayment(Request $request, ?Payment $existing = null): array
    {
        $enrollmentId = $request->input('enrollmentId', $existing?->enrollment_id);

        return $request->validate([
            'enrollmentId' => ['required', 'string', 'exists:enrollments,id'],
            'month' => [
                'required',
                'string',
                'regex:/^\d{4}-\d{2}$/',
                Rule::unique('payments', 'month')
                    ->where(fn ($query) => $query->where('enrollment_id', $enrollmentId))
                    ->ignore($existing?->id),
            ],
            'amount' => ['required', 'integer', 'min:0'],
            'expectedAmount' => ['nullable', 'integer', 'min:0'],
            'paidOn' => ['nullable', 'date'],
            'method' => ['nullable', 'string', Rule::enum(PaymentMethod::class)],
        ], [
            'enrollmentId.required' => 'L’inscription est obligatoire.',
            'month.required' => 'Le mois est obligatoire.',
            'month.regex' => 'Le mois doit être au format AAAA-MM.',
            'month.unique' => 'Un paiement existe déjà pour ce mois.',
            'amount.required' => 'Le montant est obligatoire.',
        ]);
    }
}
