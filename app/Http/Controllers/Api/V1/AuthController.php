<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\User;
use App\Support\Auth\LoginChallengeService;
use App\Support\Auth\StaffAccess;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly LoginChallengeService $challenges,
    ) {}

    /**
     * Step 1: validate credentials and e-mail a 4-digit login code.
     */
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

        [$school, $user] = $this->authenticateCredentials(
            $validated['domain'],
            $validated['email'],
            $validated['password'],
        );

        $issued = $this->challenges->issue(
            $user,
            $school,
            $validated['deviceName'] ?? 'mobile',
        );

        return response()->json([
            'requiresVerification' => true,
            'challengeToken' => $issued['plainToken'],
            'expiresIn' => LoginChallengeService::EXPIRES_MINUTES * 60,
            'message' => 'Un code à 4 chiffres a été envoyé à votre adresse e-mail.',
        ]);
    }

    /**
     * Step 2: verify the e-mail code and issue a Bearer token.
     */
    public function verifyLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string'],
            'code' => ['required', 'string', 'size:4', 'regex:/^\d{4}$/'],
        ], [
            'challengeToken.required' => 'La session de connexion est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
            'code.size' => 'Le code doit contenir 4 chiffres.',
            'code.regex' => 'Le code doit contenir 4 chiffres.',
        ]);

        $challenge = $this->challenges->findValidChallenge($validated['challengeToken']);
        $user = $this->challenges->verify($challenge, $validated['code']);

        if ($user->isBlocked()) {
            throw ValidationException::withMessages([
                'code' => ['Ce compte a été bloqué. Contactez l’administration.'],
            ]);
        }

        /** @var School $school */
        $school = $challenge->school;
        CurrentSchool::set($school);

        $abilities = StaffAccess::abilitiesFor($user->role);
        $deviceName = $challenge->device_name ?: 'mobile';
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

    /**
     * Resend a fresh 4-digit code for an open challenge.
     */
    public function resendLoginCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string'],
        ], [
            'challengeToken.required' => 'La session de connexion est obligatoire.',
        ]);

        $issued = $this->challenges->resend($validated['challengeToken']);

        return response()->json([
            'requiresVerification' => true,
            'challengeToken' => $issued['plainToken'],
            'expiresIn' => LoginChallengeService::EXPIRES_MINUTES * 60,
            'message' => 'Un nouveau code à 4 chiffres a été envoyé à votre adresse e-mail.',
        ]);
    }

    /**
     * Request a password reset e-mail (web link + token for the mobile app).
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:64'],
            'email' => ['required', 'email'],
        ], [
            'domain.required' => 'Le domaine de l’établissement est obligatoire.',
            'email.required' => 'L’adresse e-mail est obligatoire.',
            'email.email' => 'L’adresse e-mail n’est pas valide.',
        ]);

        $school = $this->resolveActiveSchool($validated['domain']);

        /** @var User|null $user */
        $user = User::query()
            ->withoutGlobalScope(SchoolScope::class)
            ->where('school_id', $school->id)
            ->where('email', $validated['email'])
            ->first();

        if ($user !== null && ! $user->isBlocked()) {
            $status = Password::broker()->sendResetLink([
                'email' => $user->email,
            ]);

            if ($status === Password::RESET_THROTTLED) {
                throw ValidationException::withMessages([
                    'email' => ['Veuillez patienter avant de demander un nouveau lien.'],
                ]);
            }
        }

        return response()->json([
            'message' => 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.',
        ]);
    }

    /**
     * Reset password with the token from the e-mail (web or mobile).
     */
    public function resetPassword(Request $request): JsonResponse
    {
        if ($request->filled('passwordConfirmation') && ! $request->filled('password_confirmation')) {
            $request->merge([
                'password_confirmation' => $request->input('passwordConfirmation'),
            ]);
        }

        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:64'],
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', PasswordRule::default(), 'confirmed'],
        ], [
            'domain.required' => 'Le domaine de l’établissement est obligatoire.',
            'email.required' => 'L’adresse e-mail est obligatoire.',
            'email.email' => 'L’adresse e-mail n’est pas valide.',
            'token.required' => 'Le jeton de réinitialisation est obligatoire.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        $school = $this->resolveActiveSchool($validated['domain']);

        /** @var User|null $user */
        $user = User::query()
            ->withoutGlobalScope(SchoolScope::class)
            ->where('school_id', $school->id)
            ->where('email', $validated['email'])
            ->first();

        if ($user === null || $user->isBlocked()) {
            throw ValidationException::withMessages([
                'email' => ['Ce lien de réinitialisation est invalide.'],
            ]);
        }

        $status = Password::broker()->reset(
            [
                'email' => $user->email,
                'password' => $validated['password'],
                'password_confirmation' => $validated['password'],
                'token' => $validated['token'],
            ],
            function (User $resetUser, string $password): void {
                $resetUser->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $resetUser->tokens()->delete();

                event(new PasswordReset($resetUser));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => [match ($status) {
                    Password::INVALID_TOKEN => 'Ce jeton de réinitialisation est invalide ou a expiré.',
                    Password::INVALID_USER => 'Ce lien de réinitialisation est invalide.',
                    default => 'Impossible de réinitialiser le mot de passe.',
                }],
            ]);
        }

        return response()->json([
            'message' => 'Mot de passe mis à jour. Vous pouvez vous connecter.',
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

    /**
     * @return array{0: School, 1: User}
     */
    private function authenticateCredentials(string $domain, string $email, string $password): array
    {
        $school = $this->resolveActiveSchool($domain);

        /** @var User|null $user */
        $user = User::query()
            ->withoutGlobalScope(SchoolScope::class)
            ->where('school_id', $school->id)
            ->where('email', $email)
            ->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        if ($user->isBlocked()) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte a été bloqué. Contactez l’administration.'],
            ]);
        }

        return [$school, $user];
    }

    private function resolveActiveSchool(string $domain): School
    {
        $domain = strtolower(trim($domain));
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

        return $school;
    }
}
