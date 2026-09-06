<?php

use App\Enums\DocumentKind;
use App\Enums\DocumentRequestStatus;
use App\Models\DocumentRequest;
use App\Models\Enrollment;
use App\Models\IssuedDocument;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

beforeEach(function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
});

test('enseignant can request a document and admin can approve it', function () {
    $school = defaultSchool();
    $teacher = User::factory()->enseignant()->create(['school_id' => $school->id]);
    $admin = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $created = $this->actingAs($teacher)
        ->postJson(route('api.v1.document-requests.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::Attestation->value,
            'academicYearId' => $enrollment->academic_year_id,
            'note' => 'Pour inscription',
        ])
        ->assertCreated()
        ->json('data');

    expect($created['status'])->toBe(DocumentRequestStatus::Pending->value)
        ->and(DocumentRequest::query()->count())->toBe(1);

    $approved = $this->actingAs($admin)
        ->postJson(route('api.v1.document-requests.approve', $created['id']))
        ->assertOk()
        ->json('data');

    expect($approved['request']['status'])->toBe(DocumentRequestStatus::Approved->value)
        ->and($approved['document']['kind'])->toBe(DocumentKind::Attestation->value)
        ->and(IssuedDocument::query()->count())->toBe(1);
});

test('admin can reject a document request', function () {
    $school = defaultSchool();
    $admin = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();

    $created = $this->actingAs($admin)
        ->postJson(route('api.v1.document-requests.store'), [
            'studentId' => $enrollment->student_id,
            'kind' => DocumentKind::Certificat->value,
            'academicYearId' => $enrollment->academic_year_id,
        ])
        ->assertCreated()
        ->json('data');

    $this->actingAs($admin)
        ->postJson(route('api.v1.document-requests.reject', $created['id']), [
            'reason' => 'Dossier incomplet',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', DocumentRequestStatus::Rejected->value)
        ->assertJsonPath('data.reviewNote', 'Dossier incomplet');

    expect(IssuedDocument::query()->count())->toBe(0);
});

test('documents hub tabs render', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);

    $this->actingAs($user)
        ->get(route('documents.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/index')
            ->has('issuedDocuments')
            ->missing('documentTemplates')
        );

    $this->actingAs($user)
        ->get(route('documents.requests'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/requests')
            ->has('documentRequests')
        );

    $this->actingAs($user)
        ->get(route('documents.templates'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/templates')
            ->has('documentTemplates', 7)
        );
});
