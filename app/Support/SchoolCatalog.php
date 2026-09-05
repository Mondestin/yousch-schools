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
     * Live SchoolDataset: Eloquent when seeded, otherwise the fixture.
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
     * @return array{cycle: string, annee: string, academicYearId: string, academicYearLabel: string, staffRole: string, rolePreview: bool, allowedCycles: list<string>}
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

        $years = collect($dataset['academicYears']);
        $annee = $request->query('annee');
        $year = is_string($annee)
            ? $years->first(fn (array $row) => self::yearQuery($row['label']) === $annee)
            : null;

        if (! is_array($year)) {
            $year = $years->firstWhere('isCurrent', true) ?? $years->first();
        }

        if (! is_array($year)) {
            throw new RuntimeException('School catalog has no academic year.');
        }

        return [
            'cycle' => $cycle,
            'annee' => self::yearQuery($year['label']),
            'academicYearId' => $year['id'],
            'academicYearLabel' => $year['label'],
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
        $dataset ??= self::dataset();
        $roles = ['admin', 'directeur', 'secretaire', 'enseignant'];
        $preview = $request->query('role');

        if (is_string($preview) && in_array($preview, $roles, true)) {
            return [$preview, true];
        }

        $user = $request->user();

        if ($user !== null && isset($user->role) && $user->role !== null) {
            $role = $user->role instanceof \BackedEnum
                ? $user->role->value
                : (string) $user->role;

            if (in_array($role, $roles, true)) {
                return [$role, false];
            }
        }

        $email = $user?->email;
        $match = collect($dataset['staffUsers'] ?? [])->firstWhere('email', $email);

        if (is_array($match) && in_array($match['role'] ?? null, $roles, true)) {
            return [$match['role'], false];
        }

        return ['admin', false];
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @return list<string>
     */
    public static function allowedCycles(?Request $request, array $dataset, bool $rolePreview): array
    {
        $catalogCycles = collect($dataset['cycles'])->pluck('value')->values();

        if ($rolePreview) {
            return $catalogCycles->all();
        }

        $user = $request?->user();

        if ($user !== null && is_array($user->cycles ?? null) && $user->cycles !== []) {
            $allowed = $catalogCycles
                ->filter(fn (mixed $cycle) => in_array($cycle, $user->cycles, true))
                ->values()
                ->all();

            return $allowed === [] ? $catalogCycles->all() : $allowed;
        }

        $email = $user?->email;
        $match = collect($dataset['staffUsers'] ?? [])->firstWhere('email', $email);
        $assigned = is_array($match) ? ($match['cycles'] ?? null) : null;

        if (! is_array($assigned) || $assigned === []) {
            return $catalogCycles->all();
        }

        $allowed = $catalogCycles
            ->filter(fn (mixed $cycle) => in_array($cycle, $assigned, true))
            ->values()
            ->all();

        return $allowed === [] ? $catalogCycles->all() : $allowed;
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
