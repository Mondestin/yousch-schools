<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\StaffRole;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\IdentityCard;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class IdentityCardController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'id-cards')) {
            return $denied;
        }

        $cards = IdentityCard::query()
            ->orderByDesc('updated_at')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return response()->json(['data' => $cards]);
    }

    public function updateTheme(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'id-cards')) {
            return $denied;
        }

        if ($user->role !== StaffRole::Admin) {
            return response()->json([
                'message' => 'Seul l’administrateur peut modifier le thème des cartes.',
            ], 403);
        }

        $validated = $request->validate([
            'idCardAccent' => ['sometimes', 'required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'idCardBody' => ['sometimes', 'required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ], [
            'idCardAccent.regex' => 'La couleur d’en-tête doit être un code hexadécimal (#RRGGBB).',
            'idCardBody.regex' => 'La couleur du fond doit être un code hexadécimal (#RRGGBB).',
        ]);

        if (! isset($validated['idCardAccent']) && ! isset($validated['idCardBody'])) {
            throw ValidationException::withMessages([
                'idCardAccent' => 'Indiquez au moins une couleur à enregistrer.',
            ]);
        }

        $profile = SchoolProfile::query()->first() ?? new SchoolProfile([
            'name' => CurrentSchool::get()?->name ?? 'École',
            'promoter_name' => '',
            'director_name' => '',
            'city' => '',
            'country' => '',
            'phone' => '',
            'email' => '',
            'address' => '',
            'motto' => '',
            'currency' => 'FCFA',
        ]);

        if ($profile->school_id === null) {
            $profile->school_id = CurrentSchool::id();
        }

        if (isset($validated['idCardAccent'])) {
            $profile->id_card_accent = strtolower($validated['idCardAccent']);
        }

        if (isset($validated['idCardBody'])) {
            $profile->id_card_body = strtolower($validated['idCardBody']);
        }

        $profile->save();

        return response()->json(['data' => $profile->toApiArray()]);
    }

    public function markPrinted(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'id-cards')) {
            return $denied;
        }

        $card = $this->resolveCard($request);

        if ($card->status === IdentityCard::STATUS_REVOKED) {
            throw ValidationException::withMessages([
                'subjectId' => 'Cette carte a été révoquée et ne peut plus être imprimée.',
            ]);
        }

        if ($card->status === IdentityCard::STATUS_BLOCKED) {
            throw ValidationException::withMessages([
                'subjectId' => 'Débloquez la carte avant de l’imprimer.',
            ]);
        }

        $card->forceFill([
            'printed_at' => now(),
            'printed_by' => $user->id,
            'status' => IdentityCard::STATUS_ACTIVE,
        ])->save();

        return response()->json(['data' => $card->fresh()->toApiArray()]);
    }

    public function block(Request $request): JsonResponse
    {
        return $this->runPrivilegedAction($request, function (IdentityCard $card, User $user): IdentityCard {
            if ($card->status === IdentityCard::STATUS_REVOKED) {
                throw ValidationException::withMessages([
                    'subjectId' => 'Une carte révoquée ne peut pas être bloquée.',
                ]);
            }

            $card->forceFill([
                'status' => IdentityCard::STATUS_BLOCKED,
                'blocked_at' => now(),
                'blocked_by' => $user->id,
            ])->save();

            return $card->fresh();
        });
    }

    public function unblock(Request $request): JsonResponse
    {
        return $this->runPrivilegedAction($request, function (IdentityCard $card, User $user): IdentityCard {
            if ($card->status === IdentityCard::STATUS_REVOKED) {
                throw ValidationException::withMessages([
                    'subjectId' => 'Une carte révoquée ne peut pas être débloquée.',
                ]);
            }

            if ($card->status !== IdentityCard::STATUS_BLOCKED) {
                throw ValidationException::withMessages([
                    'subjectId' => 'Cette carte n’est pas bloquée.',
                ]);
            }

            $card->forceFill([
                'status' => IdentityCard::STATUS_ACTIVE,
                'blocked_at' => null,
                'blocked_by' => null,
            ])->save();

            return $card->fresh();
        });
    }

    public function revoke(Request $request): JsonResponse
    {
        return $this->runPrivilegedAction($request, function (IdentityCard $card, User $user) use ($request): IdentityCard {
            if ($card->status === IdentityCard::STATUS_REVOKED) {
                throw ValidationException::withMessages([
                    'subjectId' => 'Cette carte est déjà révoquée.',
                ]);
            }

            $validated = $request->validate([
                'reason' => ['nullable', 'string', 'max:255'],
            ]);

            $card->forceFill([
                'status' => IdentityCard::STATUS_REVOKED,
                'revoked_at' => now(),
                'revoked_by' => $user->id,
                'revoke_reason' => $validated['reason'] ?? null,
                'blocked_at' => null,
                'blocked_by' => null,
            ])->save();

            return $card->fresh();
        });
    }

    /**
     * @param  callable(IdentityCard, User): IdentityCard  $callback
     */
    private function runPrivilegedAction(Request $request, callable $callback): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'id-cards')) {
            return $denied;
        }

        if (! in_array($user->role, [StaffRole::Admin, StaffRole::Directeur], true)) {
            return response()->json([
                'message' => 'Seul l’administrateur ou le directeur peut gérer le statut d’une carte.',
            ], 403);
        }

        $request->validate([
            'password' => ['required', 'current_password'],
        ], [
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.current_password' => 'Le mot de passe est incorrect.',
        ]);

        $card = $callback($this->resolveCard($request), $user);

        return response()->json(['data' => $card->toApiArray()]);
    }

    private function resolveCard(Request $request): IdentityCard
    {
        $validated = $request->validate([
            'subjectType' => ['required', Rule::in([
                IdentityCard::SUBJECT_STUDENT,
                IdentityCard::SUBJECT_TEACHER,
            ])],
            'subjectId' => ['required', 'string', 'max:64'],
        ], [
            'subjectType.required' => 'Le type de personne est obligatoire.',
            'subjectType.in' => 'Le type de personne est invalide.',
            'subjectId.required' => 'La personne est obligatoire.',
        ]);

        $this->ensureSubjectExists($validated['subjectType'], $validated['subjectId']);

        return IdentityCard::query()->firstOrCreate(
            [
                'subject_type' => $validated['subjectType'],
                'subject_id' => $validated['subjectId'],
            ],
            [
                'status' => IdentityCard::STATUS_ACTIVE,
            ],
        );
    }

    private function ensureSubjectExists(string $type, string $id): void
    {
        $exists = $type === IdentityCard::SUBJECT_STUDENT
            ? Student::query()->whereKey($id)->exists()
            : Teacher::query()->whereKey($id)->exists();

        abort_unless($exists, 404);
    }
}
