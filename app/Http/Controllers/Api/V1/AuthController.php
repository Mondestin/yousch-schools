<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\User;
use App\Support\Auth\StaffAccess;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:64'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'deviceName' => ['nullable', 'string', 'max:120'],
        ], [
            'domain.required' => 'Le domaine de l’établissement est obligatoire.',
            'email.required' => 'L’adresse e-mail est obligatoire.',
            'email.email' => 'L’adresse e-mail n’est pas valide.',
            'password.required' => 'Le mot de passe est obligatoire.',
        ]);

        $domain = strtolower(trim($validated['domain']));
        $domain = preg_replace('/[^a-z0-9\-]/', '', $domain) ?? '';

        $school = School::query()
            ->where('domain', $domain)
            ->where('status', 'active')
            ->first();

        if ($school === null) {
            throw ValidationException::withMessages([
                'domain' => ['Aucun établissement actif pour ce domaine.'],
            ]);
        }

        /** @var User|null $user */
        $user = User::query()
            ->withoutGlobalScope(SchoolScope::class)
            ->where('school_id', $school->id)
            ->where('email', $validated['email'])
            ->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        if ($user->isBlocked()) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte a été bloqué. Contactez l’administration.'],
            ]);
        }

        CurrentSchool::set($school);

        $abilities = StaffAccess::abilitiesFor($user->role);
        $deviceName = $validated['deviceName'] ?? 'mobile';
        $created = $user->createToken($deviceName, $abilities);

        $user->forceFill(['last_seen_at' => now()])->save();

        return response()->json([
            'token' => $created['plainTextToken'],
            'tokenType' => 'Bearer',
            'abilities' => $abilities,
            'school' => $school->toSharedArray(),
            'user' => $user->toStaffApiArray(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $token = $user->currentAccessToken();

        if ($token !== null) {
            $token->delete();
            Auth::guard('web')->forgetUser();
        } elseif ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        CurrentSchool::clear();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $user->toStaffApiArray(),
            'school' => CurrentSchool::get()?->toSharedArray(),
        ]);
    }
}
