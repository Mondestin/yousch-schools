<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Enums\SubscriptionValidationStatus;
use App\Http\Controllers\Controller;
use App\Models\SchoolSubscription;
use App\Models\SubscriptionReceipt;
use App\Models\User;
use App\Notifications\SubscriptionPaymentSubmittedNotification;
use App\Support\Billing\SubscriptionCatalog;
use App\Support\Billing\SubscriptionSeats;
use App\Support\SchoolCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCan($request)) {
            return $denied;
        }

        return response()->json(['data' => $this->payload()]);
    }

    public function updatePlan(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCan($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'plan' => ['required', 'string', Rule::enum(SubscriptionPlan::class)],
            'period' => ['nullable', 'string', Rule::in(['monthly', 'annual'])],
        ], [
            'plan.required' => 'La formule est obligatoire.',
        ]);

        $subscription = $this->requireSubscription();
        $period = $validated['period'] ?? $subscription->billing_period ?: 'monthly';
        $plan = SubscriptionPlan::from($validated['plan']);
        $offer = SubscriptionCatalog::offer($plan);

        if ($subscription->used_seats > $offer['seats']) {
            return response()->json([
                'message' => sprintf(
                    'Impossible de passer à %s : %d sièges sont déjà utilisés (limite %d).',
                    $offer['label'],
                    $subscription->used_seats,
                    $offer['seats'],
                ),
            ], 422);
        }

        $subscription->update([
            'plan' => $plan,
            'billing_period' => $period,
            'seats' => $offer['seats'],
            'monthly_amount' => SubscriptionCatalog::amountForPeriod($plan, $period),
            'status' => SubscriptionStatus::Active,
            'renews_on' => $period === 'annual'
                ? now()->addYear()->toDateString()
                : now()->addMonth()->toDateString(),
        ]);

        return response()->json([
            'data' => $this->payload($subscription->fresh('receipts')),
            'message' => 'Formule de facturation mise à jour.',
        ]);
    }

    public function updateBilling(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCan($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:180'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'country' => ['required', 'string', 'max:120'],
            'vat' => ['nullable', 'string', 'max:64'],
        ], [
            'name.required' => 'Le nom de facturation est obligatoire.',
            'email.required' => 'L’e-mail de facturation est obligatoire.',
            'email.email' => 'L’e-mail de facturation est invalide.',
            'address.required' => 'L’adresse est obligatoire.',
            'city.required' => 'La ville est obligatoire.',
            'country.required' => 'Le pays est obligatoire.',
        ]);

        $subscription = $this->requireSubscription();
        $subscription->update([
            'billing_name' => $validated['name'],
            'billing_email' => $validated['email'],
            'billing_address' => $validated['address'],
            'billing_city' => $validated['city'],
            'billing_country' => $validated['country'],
            'billing_vat' => $validated['vat'] ?? null,
        ]);

        return response()->json([
            'data' => $this->payload($subscription->fresh('receipts')),
            'message' => 'Adresse de facturation mise à jour.',
        ]);
    }

    public function updatePayment(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCan($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'provider' => ['required', 'string', Rule::in(['airtel', 'mtn'])],
            'transactionId' => ['required', 'string', 'min:4', 'max:64'],
        ], [
            'provider.required' => 'Le fournisseur est obligatoire.',
            'provider.in' => 'Choisissez Airtel Money ou MTN Mobile Money.',
            'transactionId.required' => 'Le numéro de transaction est obligatoire.',
            'transactionId.min' => 'Le numéro de transaction est trop court.',
            'transactionId.max' => 'Le numéro de transaction est trop long.',
        ]);

        $phone = config('billing.mobile_money.'.$validated['provider']);

        if (! is_string($phone) || $phone === '') {
            return response()->json([
                'message' => 'Le numéro Mobile Money YouSch est indisponible pour cet opérateur.',
            ], 422);
        }

        $transactionId = preg_replace('/\s+/', '', $validated['transactionId']) ?? '';

        if ($transactionId === '') {
            return response()->json([
                'message' => 'Le numéro de transaction est obligatoire.',
            ], 422);
        }

        $subscription = $this->requireSubscription();
        $subscription->update([
            'payment_provider' => $validated['provider'],
            'payment_phone' => $phone,
        ]);

        $receipt = $this->recordPendingMobileMoneyReceipt(
            $subscription,
            $validated['provider'],
            $transactionId,
        );

        $this->notifyPaymentSubmitted(
            $subscription->fresh(),
            $receipt,
            $validated['provider'],
            $phone,
        );

        return response()->json([
            'data' => $this->payload($subscription->fresh('receipts')),
            'message' => 'Paiement soumis — en attente de validation.',
        ]);
    }

    public function submitReceiptTransaction(Request $request, string $receipt): JsonResponse
    {
        if ($denied = $this->denyUnlessCan($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'transactionId' => ['required', 'string', 'min:4', 'max:64'],
            'provider' => ['nullable', 'string', Rule::in(['airtel', 'mtn'])],
        ], [
            'transactionId.required' => 'Le numéro de transaction est obligatoire.',
            'transactionId.min' => 'Le numéro de transaction est trop court.',
            'transactionId.max' => 'Le numéro de transaction est trop long.',
            'provider.in' => 'Choisissez Airtel Money ou MTN Mobile Money.',
        ]);

        $subscription = $this->requireSubscription();
        $model = $subscription->receipts()->whereKey($receipt)->first();

        if ($model === null) {
            return response()->json(['message' => 'Facture introuvable.'], 404);
        }

        if ($model->status === PaymentStatus::Paye
            || $model->validation_status === SubscriptionValidationStatus::Valide) {
            return response()->json([
                'message' => 'Cette facture est déjà validée.',
            ], 422);
        }

        $provider = $validated['provider']
            ?? $subscription->payment_provider
            ?? 'airtel';

        if (! in_array($provider, ['airtel', 'mtn'], true)) {
            $provider = 'airtel';
        }

        $phone = config('billing.mobile_money.'.$provider);

        if (! is_string($phone) || $phone === '') {
            return response()->json([
                'message' => 'Le numéro Mobile Money YouSch est indisponible pour cet opérateur.',
            ], 422);
        }

        $transactionId = preg_replace('/\s+/', '', $validated['transactionId']) ?? '';

        if ($transactionId === '') {
            return response()->json([
                'message' => 'Le numéro de transaction est obligatoire.',
            ], 422);
        }

        $method = $provider === 'mtn'
            ? PaymentMethod::MtnMoney
            : PaymentMethod::AirtelMoney;

        $subscription->update([
            'payment_provider' => $provider,
            'payment_phone' => $phone,
        ]);

        $model->update([
            'method' => $method,
            'status' => PaymentStatus::Impaye,
            'transaction_id' => $transactionId,
            'validation_status' => SubscriptionValidationStatus::EnAttente,
            'paid_on' => null,
        ]);

        $this->notifyPaymentSubmitted(
            $subscription->fresh(),
            $model->fresh(),
            $provider,
            $phone,
        );

        return response()->json([
            'data' => $this->payload($subscription->fresh('receipts')),
            'message' => 'Paiement soumis — en attente de validation.',
        ]);
    }

    /**
     * Attach or refresh the open subscription receipt with a MoMo transaction ID.
     */
    private function recordPendingMobileMoneyReceipt(
        SchoolSubscription $subscription,
        string $provider,
        string $transactionId,
        ?SubscriptionReceipt $target = null,
    ): SubscriptionReceipt {
        $method = $provider === 'mtn'
            ? PaymentMethod::MtnMoney
            : PaymentMethod::AirtelMoney;

        $receipt = $target ?? $subscription->receipts()
            ->whereIn('status', [
                PaymentStatus::Impaye->value,
                PaymentStatus::Partiel->value,
            ])
            ->where(function ($query): void {
                $query->whereNull('validation_status')
                    ->orWhereIn('validation_status', [
                        SubscriptionValidationStatus::EnAttente->value,
                        SubscriptionValidationStatus::Rejete->value,
                    ]);
            })
            ->orderByDesc('created_at')
            ->first();

        $periodLabel = Carbon::now()
            ->locale('fr')
            ->isoFormat('MMMM YYYY');
        $periodLabel = mb_convert_case($periodLabel, MB_CASE_TITLE, 'UTF-8');

        if ($receipt === null) {
            return SubscriptionReceipt::query()->create([
                'id' => (string) Str::ulid(),
                'school_subscription_id' => $subscription->id,
                'reference' => sprintf('YS-%s-%s', now()->format('Y'), now()->format('mdHi')),
                'period_label' => $periodLabel,
                'paid_on' => null,
                'amount' => $subscription->monthly_amount,
                'plan' => $subscription->plan,
                'method' => $method,
                'status' => PaymentStatus::Impaye,
                'transaction_id' => $transactionId,
                'validation_status' => SubscriptionValidationStatus::EnAttente,
            ]);
        }

        $receipt->update([
            'method' => $method,
            'status' => PaymentStatus::Impaye,
            'transaction_id' => $transactionId,
            'validation_status' => SubscriptionValidationStatus::EnAttente,
            'paid_on' => null,
            'amount' => $subscription->monthly_amount,
            'plan' => $subscription->plan,
        ]);

        return $receipt->fresh() ?? $receipt;
    }

    private function notifyPaymentSubmitted(
        SchoolSubscription $subscription,
        SubscriptionReceipt $receipt,
        string $provider,
        string $phone,
    ): void {
        $email = $subscription->billing_email;

        if (! is_string($email) || $email === '') {
            return;
        }

        $providerLabel = $provider === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money';
        $schoolName = $subscription->billing_name
            ?: (SchoolCatalog::dataset()['profile']['name'] ?? 'Votre établissement');

        Notification::route('mail', $email)
            ->notify(new SubscriptionPaymentSubmittedNotification(
                receipt: $receipt,
                schoolName: is_string($schoolName) ? $schoolName : 'Votre établissement',
                providerLabel: $providerLabel,
                collectionPhone: $phone,
            ));
    }

    public function cancel(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCan($request)) {
            return $denied;
        }

        $subscription = $this->requireSubscription();
        $subscription->update([
            'status' => SubscriptionStatus::Canceled,
        ]);

        return response()->json([
            'data' => $this->payload($subscription->fresh('receipts')),
            'message' => 'Abonnement résilié.',
        ]);
    }

    private function denyUnlessCan(Request $request): ?JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccess('subscription')) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return null;
    }

    private function requireSubscription(): SchoolSubscription
    {
        $subscription = SchoolSubscription::query()->with('receipts')->first();

        if ($subscription !== null) {
            SubscriptionSeats::syncUsedSeats($subscription);

            return $subscription->fresh('receipts') ?? $subscription;
        }

        $profile = SchoolCatalog::dataset()['profile'] ?? [];

        return SchoolSubscription::query()->create([
            'id' => (string) Str::ulid(),
            'plan' => SubscriptionPlan::Gold,
            'status' => SubscriptionStatus::Active,
            'seats' => SubscriptionCatalog::seatsFor(SubscriptionPlan::Gold),
            'used_seats' => 0,
            'renews_on' => now()->addMonth()->toDateString(),
            'monthly_amount' => SubscriptionCatalog::offer(SubscriptionPlan::Gold)['monthlyAmount'],
            'billing_period' => 'monthly',
            'billing_name' => $profile['name'] ?? null,
            'billing_email' => $profile['email'] ?? null,
            'billing_address' => $profile['address'] ?? null,
            'billing_city' => $profile['city'] ?? null,
            'billing_country' => $profile['country'] ?? null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(?SchoolSubscription $subscription = null): array
    {
        $subscription ??= SchoolSubscription::query()->with('receipts')->first();

        if ($subscription === null) {
            return SchoolCatalog::fixture()['subscription'];
        }

        SubscriptionSeats::syncUsedSeats($subscription);

        return $subscription->fresh('receipts')->toApiArray();
    }
}
