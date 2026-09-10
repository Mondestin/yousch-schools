<?php

namespace App\Support\Auth;

use App\Enums\StaffRole;

/**
 * Mirrors resources/js/lib/school-access.ts for API policies and token abilities.
 */
final class StaffAccess
{
    public const NAV_KEYS = [
        'dashboard',
        'students',
        'guardians',
        'teachers',
        'subjects',
        'timetable',
        'attendance',
        'assessments',
        'reports',
        'results',
        'cash',
        'inventory',
        'announcements',
        'documents',
        'id-cards',
        'staff',
        'school',
        'subscription',
        'structure',
        'settings',
    ];

    /**
     * @return list<string>
     */
    public static function abilitiesFor(StaffRole $role): array
    {
        return match ($role) {
            StaffRole::Admin => self::NAV_KEYS,
            StaffRole::Directeur => array_values(array_filter(
                self::NAV_KEYS,
                static fn (string $key): bool => $key !== 'staff',
            )),
            StaffRole::Secretaire => [
                'dashboard',
                'students',
                'guardians',
                'cash',
                'inventory',
                'announcements',
                'documents',
                'id-cards',
                'school',
                'structure',
                'settings',
            ],
            StaffRole::Enseignant => [
                'dashboard',
                'students',
                'teachers',
                'subjects',
                'timetable',
                'attendance',
                'assessments',
                'reports',
                'results',
                'settings',
            ],
        };
    }

    public static function can(StaffRole $role, string $ability): bool
    {
        return in_array($ability, self::abilitiesFor($role), true);
    }

    public static function managesSubscription(StaffRole $role): bool
    {
        return self::can($role, 'subscription');
    }
}
