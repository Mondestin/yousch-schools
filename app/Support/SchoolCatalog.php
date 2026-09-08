<?php

namespace App\Support;

use App\Support\School\SchoolDatasetAssembler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use RuntimeException;

final class SchoolCatalog
{
    /**
     * Raw school.json fixture (seeders + assembler fallbacks only).
     *
     * @return array<string, mixed>
     */
    public static function fixture(): array
    {
        $path = resource_path('js/mocks/school.json');
        $decoded = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($decoded)) {
            throw new RuntimeException("School catalog [{$path}] is invalid.");
        }

        return $decoded;
    }

    /**
     * Live SchoolDataset for the current tenant, or the demo fixture when no school is bound.
     *
     * @return array<string, mixed>
     *
     * @deprecated Prefer {@see SchoolDatasetAssembler}; kept as the shared entry point for Inertia + API.
     */
    public static function dataset(): array
    {
        return app(SchoolDatasetAssembler::class)->assemble();
    }

    /**
     * ASCII year used in the query string (2026-2027).
     */
    public static function yearQuery(string $label): string
    {
        return str_replace(["\u{2013}", "\u{2014}"], '-', $label);
    }

    /**
     * @return array{cycle: string, annee: string, academicYearId: string, academicYearLabel: string, isCurrentYear: bool, readOnly: bool, staffRole: string, rolePreview: bool, allowedCycles: list<string>}
     */
    public static function context(?Request $request = null): array
    {
        $request ??= request();
        $dataset = self::dataset();
        [$staffRole, $rolePreview] = self::staffRole($request, $dataset);
        $allowedCycles = self::allowedCycles($request, $dataset, $rolePreview);

        $cycle = $request->query('cycle');

        if (! is_string($cycle) || ! in_array($cycle, $allowedCycles, true)) {
            $cycle = in_array('primaire', $allowedCycles, true)
                ? 'primaire'
                : ($allowedCycles[0] ?? 'primaire');
        }

        $academicYears = $dataset['academicYears'] ?? [];
        if (! is_array($academicYears)) {
            throw new RuntimeException('School catalog has no academic year.');
        }

        $years = collect($academicYears);
        $annee = $request->query('annee');
        $year = is_string($annee)
            ? $years->first(fn (mixed $row): bool => is_array($row) && self::yearQuery((string) $row['label']) === $annee)
            : null;

        if (! is_array($year)) {
            $year = $years->firstWhere('isCurrent', true) ?? $years->first();
        }

        if (! is_array($year)) {
            throw new RuntimeException('School catalog has no academic year.');
        }

        $isCurrentYear = (bool) ($year['isCurrent'] ?? false);

        return [
            'cycle' => $cycle,
            'annee' => self::yearQuery((string) $year['label']),
            'academicYearId' => (string) $year['id'],
            'academicYearLabel' => (string) $year['label'],
            'isCurrentYear' => $isCurrentYear,
            'readOnly' => ! $isCurrentYear,
            'staffRole' => $staffRole,
            'rolePreview' => $rolePreview,
            'allowedCycles' => $allowedCycles,
        ];
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @return array{0: string, 1: bool}
     */
    public static function staffRole(?Request $request = null, ?array $dataset = null): array
    {
        $request ??= request();
        $roles = ['admin', 'directeur', 'secretaire', 'enseignant'];
        $preview = $request->query('role');

        if (is_string($preview) && in_array($preview, $roles, true)) {
            return [$preview, true];
        }

        $user = $request->user();

        if ($user !== null) {
            return [$user->role->value, false];
        }

        return ['admin', false];
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @return list<string>
     */
    public static function allowedCycles(?Request $request, array $dataset, bool $rolePreview): array
    {
        $catalogCycles = self::cycleValues($dataset);

        if ($rolePreview) {
            return $catalogCycles;
        }

        $user = $request?->user();

        if ($user !== null && is_array($user->cycles ?? null) && $user->cycles !== []) {
            $allowed = array_values(array_filter(
                $catalogCycles,
                static fn (string $cycle): bool => in_array($cycle, $user->cycles, true),
            ));

            return $allowed === [] ? $catalogCycles : $allowed;
        }

        $email = $user?->email;
        $staffUsers = $dataset['staffUsers'] ?? [];
        $match = is_array($staffUsers)
            ? collect($staffUsers)->firstWhere('email', $email)
            : null;
        $assigned = is_array($match) ? ($match['cycles'] ?? null) : null;

        if (! is_array($assigned) || $assigned === []) {
            return $catalogCycles;
        }

        $allowed = array_values(array_filter(
            $catalogCycles,
            static fn (string $cycle): bool => in_array($cycle, $assigned, true),
        ));

        return $allowed === [] ? $catalogCycles : $allowed;
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @return list<string>
     */
    private static function cycleValues(array $dataset): array
    {
        $cycles = $dataset['cycles'] ?? [];
        if (! is_array($cycles)) {
            return [];
        }

        return array_values(array_filter(array_map(
            static function (mixed $row): ?string {
                if (! is_array($row) || ! isset($row['value']) || ! is_string($row['value'])) {
                    return null;
                }

                return $row['value'];
            },
            $cycles,
        )));
    }

    /**
     * @return array{catalog: array<string, mixed>}
     */
    public static function page(): array
    {
        return [
            'catalog' => self::dataset(),
        ];
    }
}
