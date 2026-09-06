<?php

namespace App\Support\School;

use App\Enums\Cycle;
use App\Enums\VenueKind;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\CycleSchedule;
use App\Models\GradeLevel;
use App\Models\Track;
use App\Models\Venue;
use App\Support\Api\ResourceId;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Facades\DB;

/**
 * Seeds Congo school structure: niveaux, séries, classes, salles, horaires 30 min.
 */
final class SchoolStructureProvisioner
{
    public function ensureDefaults(?AcademicYear $year = null): void
    {
        if (CurrentSchool::id() === null) {
            return;
        }

        DB::transaction(function () use ($year): void {
            $this->ensureGradeLevels();
            $this->ensureTracks();
            $this->ensureSchedules();
            $this->ensureVenues();

            $year ??= AcademicYear::query()
                ->where('is_current', true)
                ->first()
                ?? AcademicYear::query()->orderByDesc('starts_on')->first();

            if ($year !== null) {
                $this->ensureClassrooms($year);
            }
        });
    }

    private function ensureGradeLevels(): void
    {
        foreach ($this->defaultGradeLevels() as $level) {
            $exists = GradeLevel::query()
                ->where('cycle', $level['cycle']->value)
                ->where('code', $level['code'])
                ->exists();

            if ($exists) {
                continue;
            }

            GradeLevel::query()->create([
                'id' => ResourceId::make('gl'),
                'cycle' => $level['cycle'],
                'code' => $level['code'],
                'name' => $level['name'],
                'position' => $level['position'],
            ]);
        }
    }

    private function ensureTracks(): void
    {
        foreach ($this->defaultTracks() as $track) {
            $exists = Track::query()
                ->where('cycle', $track['cycle']->value)
                ->where('code', $track['code'])
                ->exists();

            if ($exists) {
                continue;
            }

            Track::query()->create([
                'id' => ResourceId::make('tr'),
                'cycle' => $track['cycle'],
                'code' => $track['code'],
                'name' => $track['name'],
            ]);
        }
    }

    private function ensureSchedules(): void
    {
        $template = $this->defaultScheduleTemplate();

        foreach (Cycle::cases() as $cycle) {
            $exists = CycleSchedule::query()
                ->where('cycle', $cycle->value)
                ->exists();

            if ($exists) {
                continue;
            }

            CycleSchedule::query()->create([
                'cycle' => $cycle,
                'hours' => $template['hours'],
                'periods' => $template['periods'],
            ]);
        }
    }

    private function ensureVenues(): void
    {
        if (Venue::query()->exists()) {
            return;
        }

        foreach ($this->defaultVenues() as $venue) {
            Venue::query()->create([
                'id' => ResourceId::make('vn'),
                'name' => $venue['name'],
                'kind' => $venue['kind'],
                'building' => $venue['building'],
                'capacity' => $venue['capacity'],
                'available' => true,
            ]);
        }
    }

    private function ensureClassrooms(AcademicYear $year): void
    {
        $levels = GradeLevel::query()
            ->orderBy('cycle')
            ->orderBy('position')
            ->get();

        foreach ($levels as $level) {
            $exists = Classroom::query()
                ->where('academic_year_id', $year->id)
                ->where('grade_level_id', $level->id)
                ->exists();

            if ($exists) {
                continue;
            }

            $section = 'A';
            $code = $this->classroomCode($level->code, $section);

            Classroom::query()->create([
                'id' => ResourceId::make('cr'),
                'academic_year_id' => $year->id,
                'cycle' => $level->cycle,
                'grade_level_id' => $level->id,
                'track_id' => null,
                'code' => $code,
                'name' => trim($level->code.' '.$section),
                'section' => $section,
                'capacity' => $this->defaultCapacity($level->cycle),
            ]);
        }
    }

    private function classroomCode(string $levelCode, string $section): string
    {
        $normalized = strtoupper(str_replace(
            ['è', 'é', 'ê', 'à', 'ù', 'ô', 'î', 'ï', ' '],
            ['E', 'E', 'E', 'A', 'U', 'O', 'I', 'I', ''],
            $levelCode,
        ));

        return $normalized.'-'.$section;
    }

    private function defaultCapacity(Cycle $cycle): int
    {
        return match ($cycle) {
            Cycle::Prescolaire => 25,
            Cycle::Primaire => 40,
            Cycle::College => 45,
            Cycle::LyceeGeneral, Cycle::LyceeTechnique => 40,
        };
    }

    /**
     * @return list<array{cycle: Cycle, code: string, name: string, position: int}>
     */
    private function defaultGradeLevels(): array
    {
        return [
            ['cycle' => Cycle::Prescolaire, 'code' => 'P1', 'name' => 'P1', 'position' => 1],
            ['cycle' => Cycle::Prescolaire, 'code' => 'P2', 'name' => 'P2', 'position' => 2],
            ['cycle' => Cycle::Prescolaire, 'code' => 'P3', 'name' => 'P3', 'position' => 3],
            ['cycle' => Cycle::Prescolaire, 'code' => 'CPU', 'name' => 'CPU', 'position' => 4],

            ['cycle' => Cycle::Primaire, 'code' => 'CP', 'name' => 'Cours préparatoire', 'position' => 1],
            ['cycle' => Cycle::Primaire, 'code' => 'CE1', 'name' => 'Cours élémentaire 1', 'position' => 2],
            ['cycle' => Cycle::Primaire, 'code' => 'CE2', 'name' => 'Cours élémentaire 2', 'position' => 3],
            ['cycle' => Cycle::Primaire, 'code' => 'CM1', 'name' => 'Cours moyen 1', 'position' => 4],
            ['cycle' => Cycle::Primaire, 'code' => 'CM2', 'name' => 'Cours moyen 2', 'position' => 5],

            ['cycle' => Cycle::College, 'code' => '6ème', 'name' => 'Sixième', 'position' => 1],
            ['cycle' => Cycle::College, 'code' => '5ème', 'name' => 'Cinquième', 'position' => 2],
            ['cycle' => Cycle::College, 'code' => '4ème', 'name' => 'Quatrième', 'position' => 3],
            ['cycle' => Cycle::College, 'code' => '3ème', 'name' => 'Troisième', 'position' => 4],

            ['cycle' => Cycle::LyceeGeneral, 'code' => '2nde', 'name' => 'Seconde', 'position' => 1],
            ['cycle' => Cycle::LyceeGeneral, 'code' => '1ère', 'name' => 'Première', 'position' => 2],
            ['cycle' => Cycle::LyceeGeneral, 'code' => 'Terminale', 'name' => 'Terminale', 'position' => 3],

            ['cycle' => Cycle::LyceeTechnique, 'code' => '2nde', 'name' => 'Seconde', 'position' => 1],
            ['cycle' => Cycle::LyceeTechnique, 'code' => '1ère', 'name' => 'Première', 'position' => 2],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'Terminale', 'name' => 'Terminale', 'position' => 3],
        ];
    }

    /**
     * @return list<array{cycle: Cycle, code: string, name: string}>
     */
    private function defaultTracks(): array
    {
        return [
            ['cycle' => Cycle::LyceeGeneral, 'code' => 'A2', 'name' => 'A2'],
            ['cycle' => Cycle::LyceeGeneral, 'code' => 'A3', 'name' => 'A3'],
            ['cycle' => Cycle::LyceeGeneral, 'code' => 'A4', 'name' => 'A4'],
            ['cycle' => Cycle::LyceeGeneral, 'code' => 'C', 'name' => 'C'],
            ['cycle' => Cycle::LyceeGeneral, 'code' => 'D', 'name' => 'D'],

            ['cycle' => Cycle::LyceeTechnique, 'code' => 'BG', 'name' => 'BG'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'E', 'name' => 'E'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'F1', 'name' => 'F1'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'F2', 'name' => 'F2'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'F3', 'name' => 'F3'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'F4', 'name' => 'F4'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'H', 'name' => 'H'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'G1', 'name' => 'G1'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'G2', 'name' => 'G2'],
            ['cycle' => Cycle::LyceeTechnique, 'code' => 'G3', 'name' => 'G3'],
        ];
    }

    /**
     * @return array{
     *     hours: array{
     *         startsAt: string,
     *         endsAt: string,
     *         recess: array{startsAt: string, endsAt: string},
     *         lunch: array{startsAt: string, endsAt: string}
     *     },
     *     periods: list<array{id: string, startsAt: string, endsAt: string}>
     * }
     */
    private function defaultScheduleTemplate(): array
    {
        return [
            'hours' => [
                'startsAt' => '07:30',
                'endsAt' => '14:30',
                'recess' => [
                    'startsAt' => '10:00',
                    'endsAt' => '10:30',
                ],
                'lunch' => [
                    'startsAt' => '12:00',
                    'endsAt' => '13:00',
                ],
            ],
            'periods' => [
                ['id' => 'p1', 'startsAt' => '07:30', 'endsAt' => '08:00'],
                ['id' => 'p2', 'startsAt' => '08:00', 'endsAt' => '08:30'],
                ['id' => 'p3', 'startsAt' => '08:30', 'endsAt' => '09:00'],
                ['id' => 'p4', 'startsAt' => '09:00', 'endsAt' => '09:30'],
                ['id' => 'p5', 'startsAt' => '09:30', 'endsAt' => '10:00'],
                ['id' => 'p6', 'startsAt' => '10:30', 'endsAt' => '11:00'],
                ['id' => 'p7', 'startsAt' => '11:00', 'endsAt' => '11:30'],
                ['id' => 'p8', 'startsAt' => '11:30', 'endsAt' => '12:00'],
                ['id' => 'p9', 'startsAt' => '13:00', 'endsAt' => '13:30'],
                ['id' => 'p10', 'startsAt' => '13:30', 'endsAt' => '14:00'],
                ['id' => 'p11', 'startsAt' => '14:00', 'endsAt' => '14:30'],
            ],
        ];
    }

    /**
     * @return list<array{name: string, kind: VenueKind, building: string|null, capacity: int}>
     */
    private function defaultVenues(): array
    {
        return [
            ['name' => 'Salle 1', 'kind' => VenueKind::Salle, 'building' => 'Bâtiment A', 'capacity' => 40],
            ['name' => 'Salle 2', 'kind' => VenueKind::Salle, 'building' => 'Bâtiment A', 'capacity' => 40],
            ['name' => 'Salle 3', 'kind' => VenueKind::Salle, 'building' => 'Bâtiment B', 'capacity' => 45],
            ['name' => 'Labo sciences', 'kind' => VenueKind::Laboratoire, 'building' => 'Bâtiment B', 'capacity' => 30],
            ['name' => 'Salle informatique', 'kind' => VenueKind::Informatique, 'building' => 'Bâtiment B', 'capacity' => 28],
            ['name' => 'Atelier', 'kind' => VenueKind::Atelier, 'building' => 'Bloc technique', 'capacity' => 24],
            ['name' => 'Cour', 'kind' => VenueKind::Exterieur, 'building' => null, 'capacity' => 200],
        ];
    }
}
