<?php

use App\Models\Announcement;
use App\Models\InventoryItem;
use App\Models\Sanction;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

test('enseignant cannot manage inventory or announcements', function () {
    $this->actingAs(User::factory()->enseignant()->create());

    $this->getJson('/api/v1/inventory')->assertForbidden();
    $this->getJson('/api/v1/announcements')->assertForbidden();
});

test('secretaire can CRUD inventory announcements and sanctions', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->secretaire()->create());

    $item = $this->postJson('/api/v1/inventory', [
        'reference' => 'TEST-INV-001',
        'name' => 'Boîte de craie',
        'category' => 'Fournitures',
        'quantity' => 12,
        'minQuantity' => 5,
        'unitCost' => 2500,
        'condition' => 'bon',
        'status' => 'en_stock',
        'location' => 'Secrétariat',
        'notes' => 'Lot de rentrée',
    ])->assertCreated()
        ->json('data');

    expect($item['id'])->toStartWith('inv-')
        ->and($item['minQuantity'])->toBe(5)
        ->and(InventoryItem::query()->find($item['id']))->not->toBeNull();

    $this->putJson('/api/v1/inventory/'.$item['id'], [
        'reference' => 'TEST-INV-001',
        'name' => 'Boîte de craie blanche',
        'category' => 'Fournitures',
        'quantity' => 10,
        'minQuantity' => 5,
        'unitCost' => 2500,
        'condition' => 'bon',
        'status' => 'en_service',
        'location' => 'Secrétariat',
    ])->assertOk()
        ->assertJsonPath('data.status', 'en_service')
        ->assertJsonPath('data.name', 'Boîte de craie blanche');

    $announcement = $this->postJson('/api/v1/announcements', [
        'title' => 'Réunion parents',
        'body' => 'Samedi 12 septembre à 10h.',
        'audience' => 'parents',
        'publishedOn' => '2026-09-05',
        'expiresOn' => '2026-09-12',
    ])->assertCreated()
        ->json('data');

    expect($announcement['id'])->toStartWith('an-')
        ->and(Announcement::query()->find($announcement['id']))->not->toBeNull();

    $studentId = Student::query()->value('id');

    $sanction = $this->postJson('/api/v1/sanctions', [
        'studentId' => $studentId,
        'date' => '2026-09-04',
        'type' => 'Avertissement',
        'reason' => 'Retard répété',
    ])->assertCreated()
        ->json('data');

    expect($sanction['id'])->toStartWith('sn-')
        ->and(Sanction::query()->find($sanction['id']))->not->toBeNull();

    $this->getJson('/api/v1/sanctions?studentId='.$studentId)
        ->assertOk()
        ->assertJsonFragment(['id' => $sanction['id']]);

    $this->deleteJson('/api/v1/sanctions/'.$sanction['id'])->assertOk();
    $this->deleteJson('/api/v1/announcements/'.$announcement['id'])->assertOk();
    $this->deleteJson('/api/v1/inventory/'.$item['id'])->assertOk();

    expect(InventoryItem::query()->find($item['id']))->toBeNull();
});

test('documents return attestation certificat and dossier files', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $student = Student::query()->whereHas('enrollments')->firstOrFail();

    $attestation = $this->getJson('/api/v1/students/'.$student->id.'/documents?kind=attestation')
        ->assertOk()
        ->json('data');

    expect($attestation['kind'])->toBe('attestation')
        ->and($attestation['title'])->toBe('Attestation de scolarité')
        ->and($attestation)->toHaveKeys(['name', 'classroomName', 'yearLabel', 'profile', 'files']);

    $certificat = $this->getJson(
        '/api/v1/students/'.$student->id.'/documents?kind=certificat&academicYearId=year-2026'
    )->assertOk()
        ->json('data');

    expect($certificat['kind'])->toBe('certificat')
        ->and($certificat['title'])->toBe('Certificat de fréquentation');

    $this->getJson('/api/v1/students/'.$student->id.'/files')
        ->assertOk()
        ->assertJsonStructure(['data']);
});
