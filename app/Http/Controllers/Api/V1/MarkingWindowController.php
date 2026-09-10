<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AssessmentType;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\MarkingWindow;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\Assessment\MarkingWindowGate;
use App\Support\Assessment\MarkingWindowNotifier;
use App\Support\School\SchoolClock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarkingWindowController extends Controller
{
    use EnsuresStaffAbility;

    public function __construct(private MarkingWindowNotifier $notifier) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'assessments')) {
            return $denied;
        }

        $query = MarkingWindow::query()->orderBy('term_id')->orderBy('type');

        if ($request->filled('termId')) {
            $query->where('term_id', $request->string('termId'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $validated = $this->validatedWindow($request, ignoreUnique: true);

        $existing = MarkingWindow::query()
            ->where('term_id', $validated['termId'])
            ->where('type', $validated['type'])
            ->first();

        if ($existing !== null) {
            $existing->update([
                'opens_on' => $validated['opensOn'],
                'closes_on' => $validated['closesOn'],
            ]);
            $window = $existing->fresh();
            $status = 200;
        } else {
            $window = MarkingWindow::query()->create([
                'id' => ResourceId::make('mw'),
                'term_id' => $validated['termId'],
                'type' => $validated['type'],
                'opens_on' => $validated['opensOn'],
                'closes_on' => $validated['closesOn'],
            ]);
            $status = 201;
        }

        $this->maybeNotifyOpened($window);

        return response()->json(['data' => $window->fresh()->toApiArray()], $status);
    }

    public function update(Request $request, string $markingWindow): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        $model = MarkingWindow::query()->findOrFail($markingWindow);
        $validated = $this->validatedWindow($request, $model);

        $model->update([
            'term_id' => $validated['termId'],
            'type' => $validated['type'],
            'opens_on' => $validated['opensOn'],
            'closes_on' => $validated['closesOn'],
        ]);

        $this->maybeNotifyOpened($model->fresh());

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function close(Request $request, string $markingWindow): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        if (! MarkingWindowGate::isPrivileged($user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $model = MarkingWindow::query()->findOrFail($markingWindow);
        $model->update(['closed_at' => SchoolClock::now()]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function reopen(Request $request, string $markingWindow): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        if (! MarkingWindowGate::isPrivileged($user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $model = MarkingWindow::query()->findOrFail($markingWindow);
        $model->update(['closed_at' => null]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function notify(Request $request, string $markingWindow): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'structure')) {
            return $denied;
        }

        if (! MarkingWindowGate::isPrivileged($user)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $model = MarkingWindow::query()->findOrFail($markingWindow);
        $sent = $this->notifier->notifyTeachers($model, 'manual');

        return response()->json([
            'message' => 'Notification envoyée.',
            'sent' => $sent,
            'data' => $model->toApiArray(),
        ]);
    }

    /**
     * @return array{termId: string, type: string, opensOn: string, closesOn: string}
     */
    private function validatedWindow(
        Request $request,
        ?MarkingWindow $existing = null,
        bool $ignoreUnique = false,
    ): array {
        $typeRules = ['required', 'string', Rule::enum(AssessmentType::class)];

        if (! $ignoreUnique) {
            $unique = Rule::unique('marking_windows', 'type')
                ->where(fn ($query) => $query
                    ->where('term_id', $request->input('termId'))
                    ->where('school_id', $request->user()?->school_id));

            if ($existing !== null) {
                $unique = $unique->ignore($existing->id);
            }

            $typeRules[] = $unique;
        }

        $validated = $request->validate([
            'termId' => ['required', 'string', 'exists:terms,id'],
            'type' => $typeRules,
            'opensOn' => ['required', 'date'],
            'closesOn' => ['required', 'date', 'after_or_equal:opensOn'],
        ], [
            'termId.required' => 'Le trimestre est obligatoire.',
            'type.required' => 'Le type d’évaluation est obligatoire.',
            'type.unique' => 'Une fenêtre existe déjà pour ce trimestre et ce type.',
            'opensOn.required' => 'La date d’ouverture est obligatoire.',
            'closesOn.required' => 'La date de clôture est obligatoire.',
            'closesOn.after_or_equal' => 'La date de clôture doit être postérieure ou égale à l’ouverture.',
        ]);

        return [
            'termId' => $validated['termId'],
            'type' => $validated['type'],
            'opensOn' => $validated['opensOn'],
            'closesOn' => $validated['closesOn'],
        ];
    }

    private function maybeNotifyOpened(?MarkingWindow $window): void
    {
        if ($window === null || $window->opened_notified_at !== null) {
            return;
        }

        $today = SchoolClock::today();
        $opensOn = $window->opens_on->format('Y-m-d');
        $closesOn = $window->closes_on->format('Y-m-d');

        if ($opensOn > $today || $today > $closesOn) {
            return;
        }

        $this->notifier->notifyTeachers($window, 'opened');
        $window->update(['opened_notified_at' => SchoolClock::now()]);
    }
}
