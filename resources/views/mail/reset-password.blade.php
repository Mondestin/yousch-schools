@component('mail::message')
# Réinitialisation du mot de passe

Bonjour,

Vous recevez cet e-mail car nous avons reçu une demande de réinitialisation de mot de passe pour votre compte YouSch.

@component('mail::button', ['url' => $url, 'color' => 'primary'])
Réinitialiser mon mot de passe
@endcomponent

Ce lien expire dans {{ $count }} minutes.

Si vous n’avez pas demandé de réinitialisation, aucune action n’est nécessaire.

Cordialement,  
L’équipe YouSch
@endcomponent
