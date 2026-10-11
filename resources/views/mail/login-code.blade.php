@component('mail::message')
# Code de connexion

Bonjour {{ $name }},

Voici votre code pour finaliser la connexion à **{{ $schoolName }}** :

@component('mail::panel')
# {{ $code }}
@endcomponent

Ce code est valable **{{ $expiresInMinutes }} minutes**. Ne le partagez avec personne.

Si vous n’êtes pas à l’origine de cette connexion, ignorez cet e-mail et changez votre mot de passe.

Cordialement,  
YouSch
@endcomponent
