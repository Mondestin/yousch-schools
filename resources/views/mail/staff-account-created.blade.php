@component('mail::message')
# {{ $isResend ? 'Nouveaux identifiants' : 'Bienvenue sur YouSch' }}

Bonjour {{ $name }},

@if ($isResend)
Vos identifiants pour **{{ $schoolName }}** ({{ $roleLabel }}) ont été renouvelés.
@else
Un compte a été créé pour vous sur **{{ $schoolName }}** ({{ $roleLabel }}).
@endif

@component('mail::panel')
**Établissement (domaine)** : {{ $domain }}  
**E-mail** : {{ $email }}  
**Mot de passe temporaire** : {{ $plainPassword }}
@endcomponent

@component('mail::button', ['url' => $loginUrl, 'color' => 'primary'])
Se connecter à mon établissement
@endcomponent

Ce bouton ouvre directement la page de connexion de votre établissement (domaine déjà sélectionné).

Pour votre sécurité, changez ce mot de passe dès la première connexion (Paramètres → Sécurité).

Cordialement,  
L’équipe YouSch
@endcomponent
