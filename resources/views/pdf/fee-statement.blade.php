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
        .header {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        .header td {
            width: 50%;
            vertical-align: top;
            text-align: center;
            font-size: 11px;
            line-height: 1.4;
        }
        .header .school-name,
        .header .country-name {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 4px;
        }
        .logo {
            max-height: 72px;
            max-width: 120px;
            margin-bottom: 6px;
        }
        h1 {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 20px 0 16px;
        }
        .identity {
            margin-bottom: 16px;
            font-size: 13px;
        }
        .identity p {
            margin: 2px 0;
        }
        table.lines {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
        }
        table.lines th,
        table.lines td {
            border: 1px solid #333;
            padding: 6px 8px;
        }
        table.lines th {
            background: #f4f4f5;
            font-weight: bold;
            text-align: left;
        }
        table.lines td.num,
        table.lines th.num,
        table.lines td.center,
        table.lines th.center {
            text-align: center;
        }
        .closing {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        .closing td {
            width: 50%;
            vertical-align: top;
            font-size: 13px;
        }
        .totals p {
            margin: 4px 0;
            text-align: left;
        }
        .signature {
            margin-top: 18px;
            text-align: left;
        }
        .signature .place {
            margin-bottom: 10px;
        }
        .stamp {
            max-height: 90px;
            max-width: 90px;
            margin: 8px 0;
        }
        .role {
            font-size: 12px;
            margin: 0;
        }
        .name {
            font-weight: bold;
            margin: 2px 0 0;
        }
        .pied {
            margin-top: 28px;
            height: 8px;
            width: 100%;
            border-collapse: collapse;
        }
        .pied td {
            height: 8px;
            padding: 0;
        }
        .pied .g { background: #009543; width: 33%; }
        .pied .y { background: #fbde4a; width: 34%; }
        .pied .r { background: #dc241f; width: 33%; }
    </style>
</head>
<body>
    <table class="header">
        <tr>
            <td>
                @if (!empty($logoSrc))
                    <img class="logo" src="{{ $logoSrc }}" alt="">
                @endif
                <p class="school-name">{{ $profile['name'] }}</p>
                @if (!empty($profile['phone']))
                    <div>Tél. : {{ $profile['phone'] }}</div>
                @endif
                @if (!empty($profile['email']))
                    <div>E-mail : {{ $profile['email'] }}</div>
                @endif
                @if (!empty($profile['address']))
                    <div>{{ $profile['address'] }}</div>
                @endif
                <div>{{ $profile['city'] ?? '' }}@if (!empty($profile['city'])), @endif{{ $countryShort }}</div>
            </td>
            <td>
                <p class="country-name">{{ $countryName }}</p>
                <div>{{ $countryMotto }}</div>
                <div>-------</div>
                <div style="margin-top: 28px; font-size: 12px; font-weight: 600;">
                    Année scolaire {{ $yearLabel }}
                </div>
            </td>
        </tr>
    </table>

    <h1>Relevé de paiements</h1>

    <div class="identity">
        <p>Numéro d’élève : <strong>{{ $matricule }}</strong></p>
        <p>Établissement : <strong>{{ $profile['name'] }}</strong></p>
        <p>Classe : <strong>{{ $classroomName }}</strong></p>
        @if (!empty($trackCode))
            <p>Série : <strong>{{ $trackCode }}</strong></p>
        @endif
        <p>Nom(s) et prénom(s) : <strong>{{ $studentName }}</strong></p>
    </div>

    <table class="lines">
        <thead>
            <tr>
                <th class="num" style="width: 8%;">#</th>
                <th style="width: 32%;">Mois</th>
                <th class="center" style="width: 20%;">Montant</th>
                <th class="center" style="width: 20%;">Reste</th>
                <th class="center" style="width: 20%;">Statut</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($lines as $index => $line)
                <tr>
                    <td class="num">{{ $index + 1 }}</td>
                    <td>{{ $line['monthLabel'] }}</td>
                    <td class="center">{{ $line['amountLabel'] }}</td>
                    <td class="center">{{ $line['remainingLabel'] }}</td>
                    <td class="center">{{ $line['statusLabel'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="closing">
        <tr>
            <td></td>
            <td class="totals">
                <p>Net à payer : <strong>{{ $expectedTotalLabel }}</strong></p>
                <p>Total payé : <strong>{{ $paidTotalLabel }}</strong></p>
                <p>Total impayé : <strong>{{ $unpaidTotalLabel }}</strong></p>
                <div class="signature">
                    <p class="place">Fait à {{ $profile['city'] ?? '—' }}, le {{ $issuedOn }}</p>
                    @if (!empty($stampSrc))
                        <img class="stamp" src="{{ $stampSrc }}" alt="">
                    @endif
                    <p class="role">La Direction</p>
                    <p class="name">{{ $directorName }}</p>
                </div>
            </td>
        </tr>
    </table>

    <table class="pied">
        <tr>
            <td class="g"></td>
            <td class="y"></td>
            <td class="r"></td>
        </tr>
    </table>
</body>
</html>
