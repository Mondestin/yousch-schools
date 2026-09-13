@component('mail::message')
# {{ $headline }}

Bonjour {{ $name }},

Une annonce pour le personnel a été {{ $kind === 'updated' ? 'mise à jour' : 'publiée' }} sur **{{ $schoolName }}**.

@component('mail::panel')
**{{ $title }}**

{{ $body }}
@endcomponent

**Public** : {{ $audience }}  
**Publiée le** : {{ $publishedOn }}  
@if ($expiresOn)
**Expire le** : {{ $expiresOn }}  
@endif

@component('mail::button', ['url' => $announcementsUrl, 'color' => 'primary'])
Voir les annonces
@endcomponent

Cordialement,  
L’équipe YouSch
@endcomponent
