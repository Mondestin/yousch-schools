<?php

namespace App\Enums;

enum VenueKind: string
{
    case Salle = 'salle';
    case Laboratoire = 'laboratoire';
    case Atelier = 'atelier';
    case Informatique = 'informatique';
    case Exterieur = 'exterieur';
}
