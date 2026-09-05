<?php

namespace App\Enums;

enum GuardianRelation: string
{
    case Pere = 'pere';
    case Mere = 'mere';
    case Tuteur = 'tuteur';
    case Oncle = 'oncle';
    case Tante = 'tante';
    case Autre = 'autre';
}
