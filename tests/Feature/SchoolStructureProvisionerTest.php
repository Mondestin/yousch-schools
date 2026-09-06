<?php

use App\Enums\Cycle;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\CycleSchedule;
use App\Models\GradeLevel;
use App\Models\Track;
use App\Models\Venue;
use App\Support\School\FrenchAcademicCalendar;
use App\Support\School\SchoolStructureProvisioner;
use App\Support\Tenancy\CurrentSchool;
use App\Models\School;
use App\Models\SchoolProfile;
use App\Models\SchoolSubscription;
use Illuminate\Support\Str;

test('structure provisioner seeds levels classes tracks venues and 30-min schedules', function () {
    $school = School::query()->create([
        'name' => 'École Structure Test',
        'domain' => 'structure-test',
        'status' => 'active',
    ]);

    CurrentSchool::set($school);

    SchoolProfile::query()->create([
        'school_id' => $school->id,
        'name' => $school->name,
        'promoter_name' => '-',
        'director_name' => 'Directeur',
        'city' => 'Brazzaville',
        'country' => 'Congo',
        'phone' => '',
        'email' => 'admin@structure-test.test',
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
        'used_seats' => 0,
        'renews_on' => now()->addMonth()->toDateString(),
        'monthly_amount' => 0,
    ]);

    $year = FrenchAcademicCalendar::createCurrentYear(isCurrent: true);

    app(SchoolStructureProvisioner::class)->ensureDefaults($year);

    expect(GradeLevel::query()->count())->toBe(19)
        ->and(GradeLevel::query()->where('cycle', Cycle::Primaire)->where('code', 'CP')->exists())->toBeTrue()
        ->and(Track::query()->count())->toBe(15)
        ->and(CycleSchedule::query()->count())->toBe(5)
        ->and(Classroom::query()->where('academic_year_id', $year->id)->count())->toBe(19)
        ->and(Venue::query()->count())->toBe(7);

    $schedule = CycleSchedule::query()->where('cycle', Cycle::College)->first();

    expect($schedule)->not->toBeNull()
        ->and($schedule?->hours['startsAt'] ?? null)->toBe('07:30')
        ->and($schedule?->hours['endsAt'] ?? null)->toBe('14:30')
        ->and(count($schedule?->periods ?? []))->toBe(11)
        ->and($schedule?->periods[0]['endsAt'] ?? null)->toBe('08:00');

    // Idempotent.
    app(SchoolStructureProvisioner::class)->ensureDefaults($year);

    expect(GradeLevel::query()->count())->toBe(19)
        ->and(Classroom::query()->count())->toBe(19)
        ->and(CycleSchedule::query()->count())->toBe(5);
});
