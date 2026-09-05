<?php

namespace App\Support\School;

use App\Models\Student;

final class MatriculeGenerator
{
    public static function next(?int $year = null): string
    {
        $year ??= (int) now()->format('Y');
        $prefix = 'MAT-'.$year.'-';

        $latest = Student::query()
            ->where('matricule', 'like', $prefix.'%')
            ->orderByDesc('matricule')
            ->value('matricule');

        $sequence = 1;

        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches) === 1) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
