<?php

namespace App\Enums;

enum AssessmentType: string
{
    case Devoir = 'devoir';
    case Composition = 'composition';
    case Examen = 'examen';
}
