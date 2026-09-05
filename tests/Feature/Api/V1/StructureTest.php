<?php

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\FeeTariff;
use App\Models\SchoolProfile;
use App\Models\Term;
use App\Models\Track;
use App\Models\User;
use App\Models\Venue;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('enseignant cannot update school profile', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->enseignant()->create());

    $this->putJson('/api/v1/school/profile', [
        'name' => 'X',
        'promoterName' => 'Y',
        'directorName' => 'Z',
        'city' => 'Brazzaville',
        'country' => 'Congo',
        'phone' => '0600000000',
        'email' => 'contact@example.test',
        'address' => 'Avenue 1',
        'motto' => 'Savoir',
        'currency' => 'FCFA',
    ])->assertForbidden();
});

test('admin can update school profile and upload logo', function () {
    Storage::fake('public');
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $this->post('/api/v1/school/profile', [
        'name' => 'École Les Palmiers',
        'promoterName' => 'Promoteur',
        'directorName' => 'Directeur',
        'city' => 'Brazzaville',
        'country' => 'Congo',
        'phone' => '0652110100',
        'email' => 'contact@palmiers.cg',
        'address' => 'Avenue de la Paix',
        'motto' => 'Élever par le savoir',
        'currency' => 'FCFA',
        'logo' => UploadedFile::fake()->image('logo.png'),
    ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.name', 'École Les Palmiers')
        ->assertJsonPath('data.currency', 'FCFA');

    expect(SchoolProfile::query()->first()?->logo_url)->not->toBeNull();
});

test('admin can upsert fees and schedules', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $this->putJson('/api/v1/school/fees', [
        'fees' => [
            [
                'cycle' => 'college',
                'monthlyAmount' => 42000,
                'enrollmentAmount' => 80000,
                'reEnrollmentAmount' => 50000,
            ],
        ],
    ])->assertOk()
        ->assertJsonFragment(['cycle' => 'college', 'monthlyAmount' => 42000]);

    expect(FeeTariff::query()->where('cycle', 'college')->value('monthly_amount'))->toBe(42000);

    $this->putJson('/api/v1/school/schedules', [
        'schedules' => [
            [
                'cycle' => 'primaire',
                'hours' => [
                    'startsAt' => '07:30',
                    'endsAt' => '14:25',
                    'recess' => ['startsAt' => '10:00', 'endsAt' => '10:15'],
                    'lunch' => ['startsAt' => '12:00', 'endsAt' => '12:45'],
                ],
                'periods' => [
                    ['id' => 'p1', 'startsAt' => '07:30', 'endsAt' => '08:25'],
                ],
            ],
        ],
    ])->assertOk()
        ->assertJsonFragment(['cycle' => 'primaire', 'hours' => [
            'startsAt' => '07:30',
            'endsAt' => '14:25',
            'recess' => ['startsAt' => '10:00', 'endsAt' => '10:15'],
            'lunch' => ['startsAt' => '12:00', 'endsAt' => '12:45'],
        ]]);
});

test('structure staff can CRUD venues', function () {
    $this->actingAs(User::factory()->directeur()->create());

    $created = $this->postJson('/api/v1/school/venues', [
        'name' => 'Labo Chimie',
        'kind' => 'laboratoire',
        'building' => 'Bâtiment B',
        'capacity' => 30,
        'available' => true,
    ])->assertCreated()
        ->json('data');

    expect($created['id'])->toStartWith('vn-');

    $this->putJson('/api/v1/school/venues/'.$created['id'], [
        'name' => 'Labo Chimie 2',
        'kind' => 'laboratoire',
        'building' => 'Bâtiment B',
        'capacity' => 32,
        'available' => false,
    ])->assertOk()
        ->assertJsonPath('data.name', 'Labo Chimie 2')
        ->assertJsonPath('data.available', false);

    $this->deleteJson('/api/v1/school/venues/'.$created['id'])->assertOk();
    expect(Venue::query()->find($created['id']))->toBeNull();
});

test('creating academic year seeds three terms', function () {
    $this->actingAs(User::factory()->admin()->create());

    $payload = $this->postJson('/api/v1/academic-years', [
        'startYear' => 2030,
        'isCurrent' => true,
        'withTerms' => true,
    ])->assertCreated()
        ->json('data');

    expect($payload['id'])->toBe('year-2030')
        ->and($payload['isCurrent'])->toBeTrue()
        ->and($payload['terms'])->toHaveCount(3)
        ->and(Term::query()->where('academic_year_id', 'year-2030')->count())->toBe(3)
        ->and(AcademicYear::query()->where('is_current', true)->count())->toBe(1);
});

test('classroom code is unique per year and cycle and lycée requires track', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $this->postJson('/api/v1/classrooms', [
        'academicYearId' => 'year-2026',
        'cycle' => 'lycee_technique',
        'gradeLevelId' => 'gl-tle-t',
        'trackId' => null,
        'code' => 'TLE-X',
        'name' => 'Terminale X',
        'section' => 'X',
        'capacity' => 40,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['trackId']);

    $created = $this->postJson('/api/v1/classrooms', [
        'academicYearId' => 'year-2026',
        'cycle' => 'lycee_technique',
        'gradeLevelId' => 'gl-tle-t',
        'trackId' => 'tr-f2',
        'code' => 'TLE-X',
        'name' => 'Terminale X',
        'section' => 'X',
        'capacity' => 40,
    ])->assertCreated()
        ->json('data');

    $this->postJson('/api/v1/classrooms', [
        'academicYearId' => 'year-2026',
        'cycle' => 'lycee_technique',
        'gradeLevelId' => 'gl-tle-t',
        'trackId' => 'tr-f2',
        'code' => 'TLE-X',
        'name' => 'Terminale X bis',
        'section' => 'X',
        'capacity' => 40,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['code']);

    expect(Classroom::query()->find($created['id'])?->track_id)->toBe('tr-f2');
});

test('tracks are limited to lycée cycles', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->actingAs(User::factory()->admin()->create());

    $this->postJson('/api/v1/tracks', [
        'cycle' => 'college',
        'code' => 'Z1',
        'name' => 'Z1',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['cycle']);

    $this->postJson('/api/v1/tracks', [
        'cycle' => 'lycee_general',
        'code' => 'Z1',
        'name' => 'Z1',
    ])->assertCreated()
        ->assertJsonPath('data.code', 'Z1');

    expect(Track::query()->where('code', 'Z1')->exists())->toBeTrue();
});
