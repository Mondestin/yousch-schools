<?php

namespace App\Http\Middleware;

use App\Models\AcademicYear;
use App\Support\SchoolCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks mutating API calls when the client is browsing a non-current academic year.
 */
class EnsureCurrentAcademicYear
{
    private const EXEMPT_PREFIXES = [
        'api/v1/login',
        'api/v1/logout',
        'api/v1/me',
        'api/v1/catalog',
        'api/v1/subscription',
        'api/v1/meta/',
        'api/v1/academic-years',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array(strtoupper($request->method()), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        if ($this->isExempt($request)) {
            return $next($request);
        }

        $annee = $request->header('X-School-Annee')
            ?? $request->query('annee');

        if (! is_string($annee) || $annee === '') {
            return $next($request);
        }

        $years = AcademicYear::query()->get(['id', 'label', 'is_current']);

        if ($years->isEmpty()) {
            $fixtureYears = SchoolCatalog::dataset()['academicYears'] ?? [];
            $match = collect(is_array($fixtureYears) ? $fixtureYears : [])
                ->first(fn (mixed $row): bool => is_array($row)
                    && SchoolCatalog::yearQuery((string) ($row['label'] ?? '')) === $annee);

            if (! is_array($match)) {
                return $next($request);
            }

            if ((bool) ($match['isCurrent'] ?? false)) {
                return $next($request);
            }

            return $this->denied();
        }

        $match = $years->first(
            fn (AcademicYear $year): bool => SchoolCatalog::yearQuery($year->label) === $annee,
        );

        if ($match === null) {
            return $next($request);
        }

        if ($match->is_current) {
            return $next($request);
        }

        return $this->denied();
    }

    private function isExempt(Request $request): bool
    {
        $path = $request->path();

        foreach (self::EXEMPT_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, rtrim($prefix, '/').'/') || str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function denied(): Response
    {
        return response()->json([
            'message' => 'Cette année scolaire n’est plus modifiable. Passez à l’année en cours.',
        ], 423);
    }
}
