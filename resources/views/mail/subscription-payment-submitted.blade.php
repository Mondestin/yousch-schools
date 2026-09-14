@component('mail::message')
# Paiement soumis pour validation

Bonjour {{ $name }},

Nous avons bien enregistré votre paiement Mobile Money pour l’abonnement **{{ $schoolName }}**. Il est maintenant **en attente de validation** par YouSch.

@component('mail::panel')
**Facture** : {{ $reference }} ({{ $periodLabel }})  
**Montant** : {{ $amount }}  
**N° de transaction** : {{ $transactionId }}  
**Opérateur** : {{ $providerLabel }}  
**Numéro crédité** : {{ $collectionPhone }}
@endcomponent

Vous n’avez rien d’autre à faire pour le moment. Dès validation, le statut de la facture passera à **Validé / Payé** dans Facturation.

Cordialement,  
YouSch
@endcomponent
