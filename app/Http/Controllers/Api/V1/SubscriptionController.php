<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\Billing\SubscriptionCatalog;
use App\Support\Billing\SubscriptionSeats;
use App\Support\SchoolCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'provider' => ['required', 'string', Rule::in(['airtel', 'mtn', 'moov', 'orange'])],
            'phone' => ['required', 'string', 'max:32'],
        ], [
            'provider.required' => 'Le fournisseur est obligatoire.',
            'phone.required' => 'Le numéro Mobile Money est obligatoire.',
        ]);

        $subscription = $this->requireSubscription();
        $subscription->update([
            'payment_provider' => $validated['provider'],
            'payment_phone' => $validated['phone'],
        ]);

        return response()->json([
            'data' => $this->payload($subscription->fresh('receipts')),
            'message' => 'Préférence de paiement enregistrée.',
        ]);
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
