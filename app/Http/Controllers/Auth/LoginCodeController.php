<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Support\Auth\LoginChallengeService;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class LoginCodeController extends Controller
{
    public function __construct(
        private readonly LoginChallengeService $challenges,
    ) {}

    public function create(Request $request): Response|RedirectResponse
    {
        $token = $request->session()->get('login.challenge_token');

        if (! is_string($token) || $token === '') {
            return redirect()->route('login');
        }

        try {
            $challenge = $this->challenges->findValidChallenge($token);
        } catch (ValidationException) {
            $request->session()->forget(['login.challenge_token', 'login.remember']);

            return redirect()->route('login')
                ->withErrors(['email' => 'Ce code a expiré. Reconnectez-vous.']);
        }

        /** @var User $user */
        $user = $challenge->user;
        /** @var School $school */
        $school = $challenge->school;
        $school->loadMissing('profile');

        CurrentSchool::set($school);

        return Inertia::render('auth/login-code', [
            'email' => $this->maskEmail($user->email),
            'expiresIn' => LoginChallengeService::EXPIRES_MINUTES * 60,
            'school' => [
                'id' => $school->id,
                'name' => $school->profile?->name ?? $school->name,
                'domain' => $school->domain,
                'logoUrl' => $school->profile?->logo_url,
            ],
            'status' => session('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:4', 'regex:/^\d{4}$/'],
        ], [
            'code.required' => 'Le code est obligatoire.',
            'code.size' => 'Le code doit contenir 4 chiffres.',
            'code.regex' => 'Le code doit contenir 4 chiffres.',
        ]);

        $token = $request->session()->get('login.challenge_token');

        if (! is_string($token) || $token === '') {
            return redirect()->route('login');
        }

        $challenge = $this->challenges->findValidChallenge($token);
        $user = $this->challenges->verify($challenge, $validated['code']);

        if ($user->isBlocked()) {
            $request->session()->forget(['login.challenge_token', 'login.remember']);

            throw ValidationException::withMessages([
                'code' => ['Ce compte a été bloqué. Contactez l’administration.'],
            ]);
        }

        $remember = (bool) $request->session()->pull('login.remember', false);
        $request->session()->forget('login.challenge_token');

        /** @var School|null $school */
        $school = $challenge->school;
        if ($school !== null) {
            CurrentSchool::set($school);
        }

        if ($this->requiresTwoFactor($user)) {
            $request->session()->put([
                'login.id' => $user->getKey(),
                'login.remember' => $remember,
            ]);

            return redirect()->route('two-factor.login');
        }

        Auth::login($user, $remember);
        $request->session()->regenerate();

        $user->forceFill(['last_seen_at' => now()])->save();

        return redirect()->intended(Fortify::redirects('login'));
    }

    public function resend(Request $request): RedirectResponse
    {
        $token = $request->session()->get('login.challenge_token');

        if (! is_string($token) || $token === '') {
            return redirect()->route('login');
        }

        $issued = $this->challenges->resend($token);

        $request->session()->put('login.challenge_token', $issued['plainToken']);

        return back()->with('status', 'Un nouveau code à 4 chiffres a été envoyé à votre adresse e-mail.');
    }

    private function requiresTwoFactor(User $user): bool
    {
        if (! Features::enabled(Features::twoFactorAuthentication())) {
            return false;
        }

        if (Fortify::confirmsTwoFactorAuthentication()) {
            return filled($user->two_factor_secret) && $user->two_factor_confirmed_at !== null;
        }

        return filled($user->two_factor_secret);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        if ($local === '' || $domain === '') {
            return $email;
        }

        $visible = substr($local, 0, 1);

        return $visible.'***@'.$domain;
    }
}
