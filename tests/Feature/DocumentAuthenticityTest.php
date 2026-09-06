<?php

use App\Enums\DocumentKind;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Support\Documents\DocumentAuthenticity;
use App\Support\Tenancy\CurrentSchool;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Str;

test('staff can mint an authenticity verify url', function () {
    $school = defaultSchool();
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $student = Student::factory()->create(['school_id' => $school->id]);

    $this->actingAs($user)
        ->postJson(route('documents.authenticity'), [
            'type' => DocumentKind::Attestation->value,
            'studentId' => $student->id,
            'issuedOn' => '2026-09-06',
        ])
        ->assertOk()
        ->assertJsonStructure(['url']);
});

test('public verify page validates a signed document token', function () {
    $school = defaultSchool();
    CurrentSchool::set($school);
    $student = Student::factory()->create([
        'school_id' => $school->id,
        'first_name' => 'Amina',
        'last_name' => 'Ngoma',
        'matricule' => 'EL-2026-001',
    ]);

    $token = DocumentAuthenticity::issue([
        'type' => DocumentKind::Bulletin,
        'studentId' => $student->id,
        'issuedOn' => '2026-09-06',
    ], $school);

    CurrentSchool::clear();

    $this->get(route('documents.verify', ['token' => $token]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/verify')
            ->where('result.valid', true)
            ->where('result.kindLabel', 'Bulletin de notes')
            ->where('result.student.matricule', 'EL-2026-001')
            ->where('result.school.name', $school->name)
        );
});

test('public verify page rejects a tampered token', function () {
    $school = defaultSchool();
    CurrentSchool::set($school);
    $student = Student::factory()->create(['school_id' => $school->id]);

    $token = DocumentAuthenticity::issue([
        'type' => DocumentKind::Certificat,
        'studentId' => $student->id,
    ], $school);

    $tampered = $token.'x';

    $this->get(route('documents.verify', ['token' => $tampered]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/verify')
            ->where('result.valid', false)
        );
});

test('payment receipt authenticity requires a matching payment', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);

    $school = defaultSchool();
    CurrentSchool::set($school);
    $user = User::factory()->admin()->create(['school_id' => $school->id]);
    $enrollment = Enrollment::query()->where('classroom_id', 'cr-ce1')->firstOrFail();
    $student = Student::query()->findOrFail($enrollment->student_id);

    $payment = Payment::query()->create([
        'id' => 'py-'.Str::lower((string) Str::ulid()),
        'school_id' => $school->id,
        'enrollment_id' => $enrollment->id,
        'month' => '2026-09',
        'amount' => 25000,
        'expected_amount' => 25000,
        'status' => PaymentStatus::Paye,
        'paid_on' => '2026-09-05',
        'method' => PaymentMethod::Especes,
    ]);

    $this->actingAs($user)
        ->postJson(route('documents.authenticity'), [
            'type' => DocumentKind::PaymentReceipt->value,
            'studentId' => $student->id,
            'refId' => $payment->id,
        ])
        ->assertOk();

    $token = DocumentAuthenticity::issue([
        'type' => DocumentKind::PaymentReceipt,
        'studentId' => $student->id,
        'refId' => $payment->id,
    ], $school);

    CurrentSchool::clear();

    $this->get(route('documents.verify', ['token' => $token]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('result.valid', true)
            ->where('result.kindLabel', 'Reçu de paiement')
            ->where('result.payment.id', $payment->id)
        );
});
