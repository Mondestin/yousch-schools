<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Cycle;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\CycleSchedule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CycleScheduleController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'school')) {
            return $denied;
        }

        $schedules = CycleSchedule::query()
            ->orderBy('cycle')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return response()->json(['data' => $schedules]);
    }

    public function upsert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'school')) {
            return $denied;
        }

        $validated = $request->validate([
            'schedules' => ['required', 'array', 'min:1'],
            'schedules.*.cycle' => ['required', 'string', Rule::enum(Cycle::class)],
            'schedules.*.hours' => ['required', 'array'],
            'schedules.*.hours.startsAt' => ['required', 'string', 'max:8'],
            'schedules.*.hours.endsAt' => ['required', 'string', 'max:8'],
            'schedules.*.hours.recess' => ['nullable', 'array'],
            'schedules.*.hours.lunch' => ['nullable', 'array'],
            'schedules.*.periods' => ['required', 'array', 'min:1'],
            'schedules.*.periods.*.id' => ['required', 'string', 'max:40'],
            'schedules.*.periods.*.startsAt' => ['required', 'string', 'max:8'],
            'schedules.*.periods.*.endsAt' => ['required', 'string', 'max:8'],
        ], [
            'schedules.required' => 'Les horaires sont obligatoires.',
            'schedules.*.cycle.required' => 'Le cycle est obligatoire.',
            'schedules.*.hours.required' => 'Les heures du cycle sont obligatoires.',
            'schedules.*.periods.required' => 'Les créneaux sont obligatoires.',
        ]);

        foreach ($validated['schedules'] as $schedule) {
            CycleSchedule::query()->updateOrCreate(
                ['cycle' => $schedule['cycle']],
                [
                    'hours' => $schedule['hours'],
                    'periods' => $schedule['periods'],
                ],
            );
        }

        return $this->index($request);
    }
}
