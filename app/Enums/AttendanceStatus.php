<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case Present = 'present';
    case Absent = 'absent';
    case Retard = 'retard';
    case Excuse = 'excuse';
}
