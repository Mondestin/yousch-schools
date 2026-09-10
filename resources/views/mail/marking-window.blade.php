@component('mail::message')
# {{ $headline }}

Bonjour {{ $name }},

{{ $body }}

@component('mail::panel')
**Section** : {{ $typeLabel }}  
**Ouverture** : {{ $opensOn }}  
**Clôture** : {{ $closesOn }}
@endcomponent

Connectez-vous à YouSch pour saisir ou mettre à jour les notes de vos classes.

Cordialement,  
L’équipe YouSch
@endcomponent
