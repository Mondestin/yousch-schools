@component('mail::message')
# Vérifiez votre adresse e-mail

Bonjour,

Merci de confirmer votre adresse e-mail pour activer votre compte YouSch.

@component('mail::button', ['url' => $url, 'color' => 'primary'])
Confirmer mon e-mail
@endcomponent

Si vous n’avez pas créé de compte, vous pouvez ignorer cet e-mail.

Cordialement,  
L’équipe YouSch
@endcomponent
