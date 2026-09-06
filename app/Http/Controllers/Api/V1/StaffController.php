<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Cycle;
use App\Enums\StaffRole;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Auth\StaffCredentialsMailer;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $data = $this->staffQuery()
            ->orderBy('name')
            ->get()
            ->map(static function (User $staff): array {
                $payload = $staff->toStaffApiArray();
                unset($payload['abilities']);

                return $payload;
            })
            ->values()
            ->all();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $validated = $this->validatedStaff($request);

        $staff = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => $validated['role'],
            'cycles' => $validated['cycles'],
            'password' => $validated['password'] ?? 'temporary',
            'email_verified_at' => now(),
        ]);

        StaffCredentialsMailer::send(
            $staff,
            resend: false,
            plainPassword: $validated['password'] ?? null,
        );

        $payload = $staff->fresh()->toStaffApiArray();
        unset($payload['abilities']);

        return response()->json([
            'data' => $payload,
            'meta' => [
                'credentialsEmailed' => true,
            ],
        ], 201);
    }

    public function update(Request $request, string $staff): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $model = $this->staffQuery()->findOrFail($staff);
        $validated = $this->validatedStaff($request, $model);

        $attributes = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => $validated['role'],
            'cycles' => $validated['cycles'],
        ];

        if (! empty($validated['password'])) {
            $attributes['password'] = $validated['password'];
        }

        $model->update($attributes);

        $payload = $model->fresh()->toStaffApiArray();
        unset($payload['abilities']);

        return response()->json(['data' => $payload]);
    }

    public function destroy(Request $request, string $staff): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $model = $this->staffQuery()->findOrFail($staff);

        if ((string) $model->id === (string) $user->id) {
            throw ValidationException::withMessages([
                'id' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ]);
        }

        $model->delete();

        return response()->json(['message' => 'Compte utilisateur supprimé.']);
    }

    public function resendCredentials(Request $request, string $staff): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $model = $this->staffQuery()->findOrFail($staff);

        if ($model->isBlocked()) {
            throw ValidationException::withMessages([
                'id' => 'Impossible d’envoyer les identifiants : ce compte est bloqué.',
            ]);
        }

        StaffCredentialsMailer::send($model, resend: true);

        $payload = $model->fresh()->toStaffApiArray();
        unset($payload['abilities']);

        return response()->json([
            'data' => $payload,
            'meta' => [
                'credentialsEmailed' => true,
                'passwordRotated' => true,
            ],
            'message' => 'Nouveaux identifiants envoyés par e-mail.',
        ]);
    }

    public function block(Request $request, string $staff): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $model = $this->staffQuery()->findOrFail($staff);

        if ((string) $model->id === (string) $user->id) {
            throw ValidationException::withMessages([
                'id' => 'Vous ne pouvez pas bloquer votre propre compte.',
            ]);
        }

        $model->forceFill(['blocked_at' => now()])->save();
        $model->tokens()->delete();

        $payload = $model->fresh()->toStaffApiArray();
        unset($payload['abilities']);

        return response()->json([
            'data' => $payload,
            'message' => 'Compte bloqué.',
        ]);
    }

    public function unblock(Request $request, string $staff): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'staff')) {
            return $denied;
        }

        $model = $this->staffQuery()->findOrFail($staff);

        $model->forceFill(['blocked_at' => null])->save();

        $payload = $model->fresh()->toStaffApiArray();
        unset($payload['abilities']);

        return response()->json([
            'data' => $payload,
            'message' => 'Compte débloqué.',
        ]);
    }

    /**
     * @return Builder<User>
     */
    private function staffQuery(): Builder
    {
        return User::query()->where('school_id', CurrentSchool::require()->id);
    }

    /**
     * @return array{
     *     name: string,
     *     email: string,
     *     phone: string,
     *     role: string,
     *     cycles: list<string>,
     *     password?: string|null
     * }
     */
    private function validatedStaff(Request $request, ?User $existing = null): array
    {
        /** @var array{
         *     name: string,
         *     email: string,
         *     phone: string,
         *     role: string,
         *     cycles: list<string>,
         *     password?: string|null
         * } $validated
         */
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($existing?->id),
            ],
            'phone' => ['required', 'string', 'max:40'],
            'role' => ['required', 'string', Rule::enum(StaffRole::class)],
            'cycles' => ['required', 'array', 'min:1'],
            'cycles.*' => ['required', 'string', Rule::enum(Cycle::class)],
            'password' => [$existing ? 'nullable' : 'sometimes', 'string', 'min:8', 'max:255'],
        ], [
            'name.required' => 'Le nom est obligatoire.',
            'email.required' => 'L’e-mail est obligatoire.',
            'email.email' => 'Indiquez une adresse e-mail valide.',
            'email.unique' => 'Cet e-mail est déjà utilisé.',
            'phone.required' => 'Le téléphone est obligatoire.',
            'role.required' => 'Le rôle est obligatoire.',
            'cycles.required' => 'Choisissez au moins un niveau.',
            'cycles.min' => 'Choisissez au moins un niveau.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
        ]);

        $validated['cycles'] = array_values(array_unique($validated['cycles']));

        return $validated;
    }
}
