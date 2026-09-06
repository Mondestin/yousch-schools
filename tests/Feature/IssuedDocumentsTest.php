<?php

use App\Enums\DocumentKind;
use App\Enums\IssuedDocumentStatus;
use App\Models\Enrollment;
use App\Models\IssuedDocument;
use App\Models\User;
use App\Support\Documents\DocumentAuthenticity;
use App\Support\Tenancy\CurrentSchool;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

beforeEach(function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
});

test('staff can issue an attestation into the registry', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $response = $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::Attestation->value,
            'academicYearId' => $enrollment->academic_year_id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.kind', 'attestation')
        ->assertJsonPath('data.status', 'issued');

    $number = $response->json('data.number');
    $id = $response->json('data.id');

    expect($number)->toStartWith('ATT-'.now()->format('Y').'-')
        ->and(IssuedDocument::query()->find($id))->not->toBeNull()
        ->and($response->json('data.verifyUrl'))->toBeString()->not->toBeEmpty()
        ->and($response->json('data.fileUrl'))->toBeString()->not->toBeEmpty();
});

test('staff can list and revoke issued documents', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $created = $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::Certificat->value,
        ])
        ->assertCreated()
        ->json('data');

    $this->actingAs($user)
        ->getJson(route('api.v1.issued-documents.index', [
            'studentId' => $enrollment->student_id,
        ]))
        ->assertOk()
        ->assertJsonFragment(['id' => $created['id']]);

    $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.revoke', $created['id']), [
            'reason' => 'Erreur de saisie',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', IssuedDocumentStatus::Revoked->value)
        ->assertJsonPath('data.revokeReason', 'Erreur de saisie');
});

test('public verify accepts issued document tokens and rejects revoked ones', function () {
    $school = defaultSchool();
    CurrentSchool::set($school);
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $created = $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::Attestation->value,
        ])
        ->assertCreated()
        ->json('data');

    $token = DocumentAuthenticity::issue([
        'type' => DocumentKind::Attestation,
        'studentId' => $enrollment->student_id,
        'refId' => $created['id'],
        'issuedOn' => $created['issuedOn'],
    ], $school);

    CurrentSchool::clear();

    $this->get(route('documents.verify', ['token' => $token]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/verify')
            ->where('result.valid', true)
            ->where('result.documentNumber', $created['number'])
            ->where('result.documentStatus', 'issued')
        );

    CurrentSchool::set($school);

    $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.revoke', $created['id']), [
            'reason' => 'Annulé',
        ])
        ->assertOk();

    CurrentSchool::clear();

    $this->get(route('documents.verify', ['token' => $token]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('result.valid', false)
            ->where('result.documentNumber', $created['number'])
        );
});

test('documents hub page renders for staff', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);

    $this->actingAs($user)
        ->get(route('documents.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/index')
            ->has('issuedDocuments')
        );
});
