<?php

namespace App\Support\School;

use App\Models\School;
use App\Models\SchoolProfile;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class SchoolProvisioner
{
    /**
     * @param  array{
     *     name: string,
     *     domain: string,
     *     city?: string|null,
     *     country?: string|null,
     *     adminName: string,
     *     adminEmail: string,
     *     adminPassword: string,
     *     phone?: string|null
     * }  $input
     * @return array{school: School, user: User}
     */
    public function create(array $input): array
    {
        $domain = $this->normalizeDomain($input['domain']);

        if ($domain === '') {
            throw new InvalidArgumentException('Domaine invalide.');
        }

        if (School::query()->where('domain', $domain)->exists()) {
            throw new InvalidArgumentException("Le domaine [{$domain}] existe déjà.");
        }

        return DB::transaction(function () use ($input, $domain): array {
            $school = School::query()->create([
                'name' => $input['name'],
                'domain' => $domain,
                'status' => 'active',
            ]);

            CurrentSchool::set($school);

            $adminEmail = $input['adminEmail'];

            SchoolProfile::query()->create([
                'school_id' => $school->id,
                'name' => $school->name,
                'promoter_name' => '-',
                'director_name' => $input['adminName'],
                'city' => ($input['city'] ?? null) ?: 'Brazzaville',
                'country' => ($input['country'] ?? null) ?: 'Congo',
                'phone' => $input['phone'] ?? '',
                'email' => $adminEmail,
                'address' => '',
                'motto' => '',
                'currency' => 'FCFA',
            ]);

            SchoolSubscription::query()->create([
                'id' => (string) Str::ulid(),
                'school_id' => $school->id,
                'plan' => 'gold',
                'status' => 'active',
                'seats' => 5,
                'used_seats' => 1,
                'renews_on' => now()->addMonth()->toDateString(),
                'monthly_amount' => 0,
            ]);

            FrenchAcademicCalendar::createCurrentYear(isCurrent: true);

            $user = User::query()->create([
                'school_id' => $school->id,
                'name' => $input['adminName'],
                'email' => $adminEmail,
                'password' => Hash::make($input['adminPassword']),
                'role' => 'admin',
                'email_verified_at' => now(),
                'cycles' => [
                    'prescolaire',
                    'primaire',
                    'college',
                    'lycee_general',
                    'lycee_technique',
                ],
            ]);

            return [
                'school' => $school,
                'user' => $user,
            ];
        });
    }

    public function normalizeDomain(string $domain): string
    {
        $domain = strtolower(trim($domain));

        return (string) preg_replace('/[^a-z0-9\-]/', '', $domain);
    }
}
