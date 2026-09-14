@component('mail::message')
# Rappel de frais scolaires

Bonjour {{ $name }},

@if (!empty($customMessage))
{{ $customMessage }}
@else
Nous vous rappelons qu’un solde reste dû pour **{{ $studentName }}** ({{ $classroomName }}) à **{{ $schoolName }}**.
@endif

@component('mail::panel')
**Élève** : {{ $studentName }} ({{ $classroomName }})  
**Mois** : {{ $monthLabel }}  
**Statut** : {{ $status }}  
**Reste à payer** : {{ $dueAmount }}
@if (!empty($schoolPhone))

**Mobile Money / caisse** : {{ $schoolPhone }}
@endif
@endcomponent

@if (!empty($paymentUrl))
Un lien de paiement (Mobile Money / caisse) et le relevé PDF sont inclus dans cet e-mail.
@else
Merci de régulariser cette situation auprès de la caisse de l’établissement. Le relevé PDF est joint à cet e-mail.
@endif

Cordialement,  
{{ $schoolName }}
@endcomponent
