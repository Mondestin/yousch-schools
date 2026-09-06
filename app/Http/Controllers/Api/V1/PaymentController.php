<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\User;
use App\Support\Api\ResourceId;
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
