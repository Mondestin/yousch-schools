<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Inscrit = 'inscrit';
    case Transfere = 'transfere';
    case Abandonne = 'abandonne';
}
