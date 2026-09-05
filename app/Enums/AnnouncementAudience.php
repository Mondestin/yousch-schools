<?php

namespace App\Enums;

enum AnnouncementAudience: string
{
    case Parents = 'parents';
    case Personnel = 'personnel';
    case Eleves = 'eleves';
    case Tous = 'tous';
}
