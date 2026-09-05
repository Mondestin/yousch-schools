<?php

namespace App\Enums;

enum AdmissionStatus: string
{
    case Recue = 'recue';
    case EnEtude = 'en_etude';
    case Acceptee = 'acceptee';
    case Refusee = 'refusee';
    case Inscrit = 'inscrit';
}
