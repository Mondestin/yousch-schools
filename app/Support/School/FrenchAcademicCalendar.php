<?php

namespace App\Support\School;

use App\Models\AcademicYear;
use App\Models\Term;
use App\Support\Api\ResourceId;
use App\Support\Tenancy\CurrentSchool;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * French / Congo school calendar: septembre → juillet, three trimestres.
 */
final class FrenchAcademicCalendar
{
    /**
     * Start year of the school year containing $on (e.g. 2026 for 2026-2027).
     */
    public static function startYear(?CarbonInterface $on = null): int
    {
        $on ??= now();

        return $on->month >= 9 ? $on->year : $on->year - 1;
    }

    public static function label(int $startYear): string
    {
        return $startYear.'-'.($startYear + 1);
    }

    /**
     * Ensure the current school has at least one academic year (current French pattern).
     */
    public static function ensureCurrentYear(): AcademicYear
    {
        if (CurrentSchool::id() === null) {
            throw new RuntimeException('Aucun établissement n’est résolu pour créer l’année scolaire.');
        }

        $existing = AcademicYear::query()->orderByDesc('starts_on')->first();

        if ($existing !== null) {
            if (! $existing->is_current) {
                AcademicYear::query()->where('is_current', true)->update(['is_current' => false]);
                $existing->forceFill(['is_current' => true])->save();
            }

            return $existing;
        }

        return self::createCurrentYear(isCurrent: true);
    }

    public static function createCurrentYear(bool $isCurrent = true, ?CarbonInterface $on = null): AcademicYear
    {
        if (CurrentSchool::id() === null) {
            throw new RuntimeException('Aucun établissement n’est résolu pour créer l’année scolaire.');
        }

        $startYear = self::startYear($on);
        $nextYear = $startYear + 1;

        return DB::transaction(function () use ($startYear, $nextYear, $isCurrent): AcademicYear {
            if ($isCurrent) {
                AcademicYear::query()->where('is_current', true)->update(['is_current' => false]);
            }

            $year = AcademicYear::query()->create([
                'id' => ResourceId::make('year'),
                'label' => self::label($startYear),
                'starts_on' => sprintf('%d-09-01', $startYear),
                'ends_on' => sprintf('%d-07-15', $nextYear),
                'is_current' => $isCurrent,
            ]);

            self::seedTerms($year, $startYear, $nextYear);

            return $year;
        });
    }

    private static function seedTerms(AcademicYear $year, int $startYear, int $nextYear): void
    {
        Term::query()->create([
            'id' => ResourceId::make('term'),
            'academic_year_id' => $year->id,
            'name' => '1er trimestre',
            'position' => 1,
            'starts_on' => sprintf('%d-09-01', $startYear),
            'ends_on' => sprintf('%d-12-18', $startYear),
        ]);

        Term::query()->create([
            'id' => ResourceId::make('term'),
            'academic_year_id' => $year->id,
            'name' => '2e trimestre',
            'position' => 2,
            'starts_on' => sprintf('%d-01-05', $nextYear),
            'ends_on' => sprintf('%d-03-31', $nextYear),
        ]);

        Term::query()->create([
            'id' => ResourceId::make('term'),
            'academic_year_id' => $year->id,
            'name' => '3e trimestre',
            'position' => 3,
            'starts_on' => sprintf('%d-04-12', $nextYear),
            'ends_on' => sprintf('%d-07-15', $nextYear),
        ]);
    }
}
