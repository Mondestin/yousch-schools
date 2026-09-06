<?php

use App\Enums\DocumentKind;
use App\Models\DocumentTemplate;
use App\Models\Enrollment;
use App\Models\IssuedDocument;
use App\Models\User;
use App\Support\Storage\SchoolStorage;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

beforeEach(function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
});

test('staff can bulk issue documents for a classroom', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $classroomId = 'cr-ce1';
    $yearId = Enrollment::query()
        ->where('classroom_id', $classroomId)
        ->value('academic_year_id');

    $expected = Enrollment::query()
        ->where('classroom_id', $classroomId)
        ->where('academic_year_id', $yearId)
        ->pluck('student_id')
        ->unique()
        ->count();

    expect($expected)->toBeGreaterThan(0);

    $response = $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.bulk'), [
            'classroomId' => $classroomId,
            'kind' => DocumentKind::Attestation->value,
            'academicYearId' => $yearId,
        ])
        ->assertCreated();

    expect($response->json('data.createdCount'))->toBe($expected)
        ->and($response->json('data.failedCount'))->toBe(0)
        ->and(IssuedDocument::query()->where('kind', 'attestation')->count())->toBe($expected);
});

test('staff can list and update document templates', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);

    $list = $this->actingAs($user)
        ->getJson(route('api.v1.document-templates.index'))
        ->assertOk()
        ->json('data');

    expect($list)->toHaveCount(7);

    $template = DocumentTemplate::query()->where('kind', 'attestation')->firstOrFail();

    $this->actingAs($user)
        ->putJson(route('api.v1.document-templates.update', $template->id), [
            'title' => 'Attestation de scolarité (mise à jour)',
            'body' => 'L’élève {{name}} ({{matricule}}) est inscrit en {{classroomName}}.',
        ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Attestation de scolarité (mise à jour)')
        ->assertJsonPath(
            'data.body',
            'L’élève {{name}} ({{matricule}}) est inscrit en {{classroomName}}.',
        );

    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $issued = $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::Attestation->value,
            'academicYearId' => $enrollment->academic_year_id,
        ])
        ->assertCreated()
        ->json('data');

    expect($issued['title'])->toBe('Attestation de scolarité (mise à jour)')
        ->and($issued['fileUrl'])->not->toBeEmpty();

    $path = SchoolStorage::pathFromUrl($issued['fileUrl']);
    expect($path)->not->toBeNull();
    $html = SchoolStorage::disk()->get($path);
    expect($html)->toContain('est inscrit en');
});

test('documents hub exposes registry', function () {
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

test('staff can issue an attestation de transfert', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $this->actingAs($user)
        ->postJson(route('api.v1.issued-documents.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::AttestationTransfert->value,
            'academicYearId' => $enrollment->academic_year_id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.kind', 'attestation_transfert')
        ->assertJsonPath('data.title', 'Attestation de transfert');
});
