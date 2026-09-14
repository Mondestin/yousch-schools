<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14mm 16mm 16mm; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #111;
            line-height: 1.45;
        }
        .school-header {
            text-align: center;
            margin-bottom: 18px;
            font-size: 11px;
            line-height: 1.4;
        }
        .school-header .name {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 4px;
        }
        .logo {
            max-height: 64px;
            max-width: 110px;
            margin-bottom: 6px;
        }
        h1 {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 16px 0 18px;
        }
        .rows {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 24px;
        }
        .rows td {
            padding: 7px 0;
            border-bottom: 1px solid #ddd;
        }
        .rows td.label {
            color: #666;
            width: 40%;
        }
        .rows td.value {
            font-weight: 600;
            text-align: right;
        }
        .signature {
            margin-top: 20px;
            font-size: 13px;
        }
        .stamp {
            max-height: 90px;
            max-width: 90px;
            margin: 8px 0;
        }
        .role { margin: 0; font-size: 12px; }
        .signer { margin: 2px 0 0; font-weight: bold; }
        .pied {
            margin-top: 28px;
            height: 8px;
            width: 100%;
            border-collapse: collapse;
        }
        .pied td { height: 8px; padding: 0; }
        .pied .g { background: #009543; width: 33%; }
        .pied .y { background: #fbde4a; width: 34%; }
        .pied .r { background: #dc241f; width: 33%; }
    </style>
</head>
<body>
    <div class="school-header">
        @if (!empty($logoSrc))
            <img class="logo" src="{{ $logoSrc }}" alt="">
        @endif
        <p class="name">{{ $profile['name'] }}</p>
        @if (!empty($profile['address']))
            <div>{{ $profile['address'] }}</div>
        @endif
        <div>
            @if (!empty($profile['city'])){{ $profile['city'] }}, {{ $countryShort }}@endif
            @if (!empty($profile['phone'])) · {{ $profile['phone'] }}@endif
        </div>
        @if (!empty($profile['email']))
            <div>{{ $profile['email'] }}</div>
        @endif
    </div>

    <h1>Reçu de paiement</h1>

    <table class="rows">
        <tr>
            <td class="label">Élève</td>
            <td class="value">{{ $studentName }}</td>
        </tr>
        <tr>
            <td class="label">Matricule</td>
            <td class="value">{{ $matricule }}</td>
        </tr>
        <tr>
            <td class="label">Classe</td>
            <td class="value">{{ $classroomName }}</td>
        </tr>
        <tr>
            <td class="label">Mois</td>
            <td class="value">{{ $monthLabel }}</td>
        </tr>
        <tr>
            <td class="label">Montant reçu</td>
            <td class="value">{{ $amountLabel }}</td>
        </tr>
        <tr>
            <td class="label">Net à payer</td>
            <td class="value">{{ $expectedLabel }}</td>
        </tr>
        <tr>
            <td class="label">Statut</td>
            <td class="value">{{ $statusLabel }}</td>
        </tr>
        <tr>
            <td class="label">Date</td>
            <td class="value">{{ $paidOnLabel }}</td>
        </tr>
        @if (!empty($methodLabel))
            <tr>
                <td class="label">Mode</td>
                <td class="value">{{ $methodLabel }}</td>
            </tr>
        @endif
    </table>

    <div class="signature">
        <p>Fait à {{ $profile['city'] ?? '—' }}, le {{ $issuedOn }}</p>
        @if (!empty($stampSrc))
            <img class="stamp" src="{{ $stampSrc }}" alt="">
        @endif
        <p class="role">La caisse</p>
        <p class="signer">{{ $directorName }}</p>
    </div>

    <table class="pied">
        <tr>
            <td class="g"></td>
            <td class="y"></td>
            <td class="r"></td>
        </tr>
    </table>
</body>
</html>
