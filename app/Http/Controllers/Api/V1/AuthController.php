<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Auth\StaffAccess;
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
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'deviceName' => ['nullable', 'string', 'max:120'],
        ], [
            'email.required' => 'L’adresse e-mail est obligatoire.',
            'email.email' => 'L’adresse e-mail n’est pas valide.',
            'password.required' => 'Le mot de passe est obligatoire.',
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $validated['email'])->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        $abilities = StaffAccess::abilitiesFor($user->role);
        $deviceName = $validated['deviceName'] ?? 'mobile';
        $created = $user->createToken($deviceName, $abilities);

        $user->forceFill(['last_seen_at' => now()])->save();

        return response()->json([
            'token' => $created['plainTextToken'],
            'tokenType' => 'Bearer',
            'abilities' => $abilities,
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

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $user->toStaffApiArray(),
        ]);
    }
}
