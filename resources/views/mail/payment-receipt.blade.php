@component('mail::message')
# Reçu de paiement

Bonjour {{ $name }},

Veuillez trouver ci-joint le reçu de paiement pour **{{ $studentName }}** ({{ $classroomName }}) à **{{ $schoolName }}**.

@component('mail::panel')
**Mois** : {{ $monthLabel }}  
**Montant reçu** : {{ $amount }}
@endcomponent

Conservez ce document pour vos archives.

Cordialement,  
{{ $schoolName }}
@endcomponent
