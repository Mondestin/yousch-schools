<?php

use App\Models\CashMovement;
use App\Models\Enrollment;
use App\Models\FeeTariff;
use App\Models\Payment;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

test('enseignant cannot access caisse endpoints', function () {
    $this->actingAs(User::factory()->enseignant()->create());

    $this->getJson('/api/v1/payments')->assertForbidden();
    $this->getJson('/api/v1/cash-movements')->assertForbidden();
});

test('payment expectedAmount comes from fee tariff and status follows amount', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->secretaire()->create());

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();
    $expected = (int) FeeTariff::query()->where('cycle', 'primaire')->value('monthly_amount');

    $partial = $this->postJson('/api/v1/payments', [
        'enrollmentId' => $enrollment->id,
        'month' => '2026-10',
        'amount' => (int) floor($expected / 2),
        'method' => 'especes',
        'paidOn' => '2026-10-05',
    ])->assertCreated()
        ->json('data');

    expect($partial['expectedAmount'])->toBe($expected)
        ->and($partial['status'])->toBe('partiel');

    $paid = $this->putJson('/api/v1/payments/'.$partial['id'], [
        'enrollmentId' => $enrollment->id,
        'month' => '2026-10',
        'amount' => $expected,
        'method' => 'mobile_money',
        'paidOn' => '2026-10-10',
    ])->assertOk()
        ->json('data');

    expect($paid['status'])->toBe('paye')
        ->and(Payment::query()->find($partial['id'])?->method->value)->toBe('mobile_money');

    $receipt = $this->getJson('/api/v1/students/'.$enrollment->student_id.'/receipt?academicYearId=year-2026')
        ->assertOk()
        ->json('data');

    expect($receipt)->toHaveKeys(['lines', 'expectedTotal', 'paidTotal', 'unpaidTotal', 'profile'])
        ->and($receipt['monthlyAmount'])->toBe($expected);
});

test('cash movements are a separate entree sortie journal', function () {
    $this->actingAs(User::factory()->directeur()->create());

    $created = $this->postJson('/api/v1/cash-movements', [
        'date' => '2026-09-15',
        'kind' => 'sortie',
        'label' => 'Achat de craie',
        'description' => 'Fournitures de bureau',
        'amount' => 15000,
        'method' => 'especes',
    ])->assertCreated()
        ->json('data');

    expect($created['id'])->toStartWith('ca-')
        ->and($created['kind'])->toBe('sortie')
        ->and(CashMovement::query()->find($created['id']))->not->toBeNull();

    $this->putJson('/api/v1/cash-movements/'.$created['id'], [
        'date' => '2026-09-15',
        'kind' => 'entree',
        'label' => 'Don parent',
        'amount' => 20000,
        'method' => 'virement',
    ])->assertOk()
        ->assertJsonPath('data.kind', 'entree');
});
