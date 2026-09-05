<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Cycle;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\FeeTariff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeeTariffController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'school')) {
            return $denied;
        }

        $fees = FeeTariff::query()
            ->orderBy('cycle')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return response()->json(['data' => $fees]);
    }

    public function upsert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'school')) {
            return $denied;
        }

        $validated = $request->validate([
            'fees' => ['required', 'array', 'min:1'],
            'fees.*.cycle' => ['required', 'string', Rule::enum(Cycle::class)],
            'fees.*.monthlyAmount' => ['required', 'integer', 'min:0'],
            'fees.*.enrollmentAmount' => ['required', 'integer', 'min:0'],
            'fees.*.reEnrollmentAmount' => ['required', 'integer', 'min:0'],
        ], [
            'fees.required' => 'La liste des tarifs est obligatoire.',
            'fees.*.cycle.required' => 'Le cycle est obligatoire.',
            'fees.*.monthlyAmount.required' => 'La mensualité est obligatoire.',
            'fees.*.enrollmentAmount.required' => 'Les frais d’inscription sont obligatoires.',
            'fees.*.reEnrollmentAmount.required' => 'Les frais de réinscription sont obligatoires.',
        ]);

        foreach ($validated['fees'] as $fee) {
            FeeTariff::query()->updateOrCreate(
                ['cycle' => $fee['cycle']],
                [
                    'monthly_amount' => $fee['monthlyAmount'],
                    'enrollment_amount' => $fee['enrollmentAmount'],
                    're_enrollment_amount' => $fee['reEnrollmentAmount'],
                ],
            );
        }

        return $this->index($request);
    }
}
