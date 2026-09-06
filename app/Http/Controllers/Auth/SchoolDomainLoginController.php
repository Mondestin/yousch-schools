<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SchoolDomainLoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/login-domain', [
            'status' => session('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:64'],
        ], [
            'domain.required' => 'Le domaine de l’établissement est obligatoire.',
        ]);

        $domain = $this->normalizeDomain($validated['domain']);

        $school = School::query()
            ->where('domain', $domain)
            ->where('status', 'active')
            ->first();

        if ($school === null) {
            throw ValidationException::withMessages([
                'domain' => ['Aucun établissement actif pour ce domaine.'],
            ]);
        }

        return redirect()->route('login.domain', ['domain' => $school->domain]);
    }

    public function show(Request $request, string $domain): Response|RedirectResponse
    {
        $school = School::query()
            ->where('domain', $this->normalizeDomain($domain))
            ->where('status', 'active')
            ->first();

        if ($school === null) {
            abort(404);
        }

        $school->loadMissing('profile');

        $request->session()->put('login.school_id', $school->id);
        $request->session()->put('login.school_domain', $school->domain);

        return Inertia::render('auth/login', [
            'canResetPassword' => true,
            'status' => session('status'),
            'school' => [
                'id' => $school->id,
                'name' => $school->profile?->name ?? $school->name,
                'domain' => $school->domain,
                'logoUrl' => $school->profile?->logo_url,
            ],
        ]);
    }

    private function normalizeDomain(string $domain): string
    {
        $domain = strtolower(trim($domain));
        $domain = preg_replace('/[^a-z0-9\-]/', '', $domain) ?? '';

        return $domain;
    }
}
