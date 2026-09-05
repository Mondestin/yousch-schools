<?php

namespace App\Enums;

enum ReenrollmentStatus: string
{
    case Demandee = 'demandee';
    case EnEtude = 'en_etude';
    case Validee = 'validee';
    case Refusee = 'refusee';
}
