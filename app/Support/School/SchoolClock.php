<?php

namespace App\Support\School;

use Illuminate\Support\Carbon;

final class SchoolClock
{
    public static function timezone(): string
    {
        return 'Africa/Brazzaville';
    }

    public static function now(): Carbon
    {
        return Carbon::now(self::timezone());
    }

    public static function today(): string
    {
        return self::now()->toDateString();
    }
}
