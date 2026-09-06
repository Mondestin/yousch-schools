<?php

namespace App\Support\Tenancy;

use App\Models\School;
use RuntimeException;

final class CurrentSchool
{
    private static ?School $school = null;

    public static function set(?School $school): void
    {
        self::$school = $school;
    }

    public static function clear(): void
    {
        self::$school = null;
    }

    public static function get(): ?School
    {
        return self::$school;
    }

    public static function id(): ?string
    {
        return self::$school?->id;
    }

    public static function require(): School
    {
        if (self::$school === null) {
            throw new RuntimeException('Aucun établissement n’est résolu pour cette requête.');
        }

        return self::$school;
    }

    public static function check(): bool
    {
        return self::$school !== null;
    }
}
