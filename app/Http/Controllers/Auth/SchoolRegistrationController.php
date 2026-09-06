<?php

namespace App\Http\Controllers\Auth;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Support\School\SchoolProvisioner;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class SchoolRegistrationController extends Controller
{
    use PasswordValidationRules;

    public function create(): Response
    {
        return Inertia::render('auth/register-school', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function store(Request $request, SchoolProvisioner $provisioner): RedirectResponse
    {
        $request->merge([
            'domain' => $provisioner->normalizeDomain((string) $request->input('domain', '')),
        ]);

        $validated = $request->validate([
            'schoolName' => ['required', 'string', 'max:180'],
            'domain' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique(School::class, 'domain'),
            ],
            'city' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'adminName' => ['required', 'string', 'max:120'],
            'adminEmail' => [
                'required',
                'email',
                'max:255',
                Rule::unique(User::class, 'email'),
            ],
            'password' => $this->passwordRules(),
        ], [
            'schoolName.required' => 'Le nom de l’établissement est obligatoire.',
            'domain.required' => 'Le domaine de connexion est obligatoire.',
            'domain.regex' => 'Le domaine ne peut contenir que des lettres, chiffres et tirets.',
            'domain.unique' => 'Ce domaine est déjà utilisé.',
            'adminName.required' => 'Le nom de l’administrateur est obligatoire.',
            'adminEmail.required' => 'L’e-mail de l’administrateur est obligatoire.',
            'adminEmail.email' => 'Indiquez une adresse e-mail valide.',
            'adminEmail.unique' => 'Cet e-mail est déjà utilisé.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        try {
            ['school' => $school, 'user' => $user] = $provisioner->create([
                'name' => $validated['schoolName'],
                'domain' => $validated['domain'],
                'city' => $validated['city'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'adminName' => $validated['adminName'],
                'adminEmail' => $validated['adminEmail'],
                'adminPassword' => $validated['password'],
            ]);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'domain' => [$exception->getMessage()],
            ]);
        }

        CurrentSchool::set($school);
        $request->session()->put('login.school_id', $school->id);
        $request->session()->put('login.school_domain', $school->domain);

        Auth::login($user);
        $request->session()->regenerate();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Établissement créé. Bienvenue sur Yousch.',
        ]);

        return redirect()->route('dashboard');
    }
}
