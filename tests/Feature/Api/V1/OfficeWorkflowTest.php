<?php

use App\Enums\PaymentStatus;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Notifications\FeeReminderNotification;
use App\Support\Api\ResourceId;
use App\Support\School\DossierChecklist;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Support\Facades\Notification;

test('cash staff can batch remind unpaid fees to guardian email', function () {
    Notification::fake();
    $this->seed(SchoolTaxonomySeeder::class);

    $admin = User::factory()->admin()->create();
    $classroom = Classroom::query()->where('cycle', 'primaire')->firstOrFail();
    $student = Student::query()->create([
        'id' => ResourceId::make('st'),
        'matricule' => 'YS-TEST-001',
        'first_name' => 'Awa',
        'last_name' => 'Mbemba',
        'gender' => 'femme',
        'born_on' => '2016-01-01',
        'city' => 'Brazzaville',
        'neighborhood' => 'Bacongo',
        'enrolled_on' => now()->toDateString(),
    ]);
    $guardian = Guardian::query()->create([
        'id' => ResourceId::make('gu'),
        'first_name' => 'Jean',
        'last_name' => 'Mbemba',
        'phone' => '06 000 00 00',
        'profession' => 'Chauffeur',
        'email' => 'jean.relance@example.test',
    ]);
    $student->guardians()->attach($guardian->id, ['relation' => 'pere']);
    $enrollment = Enrollment::query()->create([
        'id' => ResourceId::make('en'),
        'student_id' => $student->id,
        'classroom_id' => $classroom->id,
        'academic_year_id' => $classroom->academic_year_id,
        'status' => 'inscrit',
    ]);
    $payment = Payment::query()->create([
        'id' => ResourceId::make('py'),
        'enrollment_id' => $enrollment->id,
        'month' => '2026-09',
        'amount' => 0,
        'expected_amount' => 25000,
        'status' => PaymentStatus::Impaye->value,
    ]);

    $this->actingAs($admin)
        ->postJson('/api/v1/payments/remind', [
            'message' => 'Merci de régulariser rapidement.',
            'items' => [
                [
                    'enrollmentId' => $enrollment->id,
                    'month' => '2026-09',
                ],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('data.sent', 1);

    expect($payment->fresh()->last_reminded_at)->not->toBeNull();

    Notification::assertSentOnDemand(
        FeeReminderNotification::class,
        function (FeeReminderNotification $notification): bool {
            return $notification->customMessage === 'Merci de régulariser rapidement.'
                && is_string($notification->paymentUrl)
                && is_string($notification->pdfBinary)
                && str_starts_with($notification->pdfBinary, '%PDF');
        },
    );
});

test('cash staff can email a payment receipt to guardian', function () {
    Notification::fake();
    $this->seed(SchoolTaxonomySeeder::class);

    $admin = User::factory()->admin()->create();
    $classroom = Classroom::query()->where('cycle', 'primaire')->firstOrFail();
    $student = Student::query()->create([
        'id' => ResourceId::make('st'),
        'matricule' => 'YS-TEST-002',
        'first_name' => 'Awa',
        'last_name' => 'Mbemba',
        'gender' => 'femme',
        'born_on' => '2016-01-01',
        'city' => 'Brazzaville',
        'neighborhood' => 'Bacongo',
        'enrolled_on' => now()->toDateString(),
    ]);
    $guardian = Guardian::query()->create([
        'id' => ResourceId::make('gu'),
        'first_name' => 'Jean',
        'last_name' => 'Mbemba',
        'phone' => '06 000 00 00',
        'profession' => 'Chauffeur',
        'email' => 'jean.recu@example.test',
    ]);
    $student->guardians()->attach($guardian->id, ['relation' => 'pere']);
    $enrollment = Enrollment::query()->create([
        'id' => ResourceId::make('en'),
        'student_id' => $student->id,
        'classroom_id' => $classroom->id,
        'academic_year_id' => $classroom->academic_year_id,
        'status' => 'inscrit',
    ]);
    $payment = Payment::query()->create([
        'id' => ResourceId::make('py'),
        'enrollment_id' => $enrollment->id,
        'month' => '2026-09',
        'amount' => 25000,
        'expected_amount' => 25000,
        'status' => PaymentStatus::Paye->value,
        'paid_on' => now()->toDateString(),
        'method' => 'especes',
    ]);

    $this->actingAs($admin)
        ->postJson("/api/v1/payments/{$payment->id}/email-receipt")
        ->assertOk()
        ->assertJsonPath('data.ok', true);

    Notification::assertSentOnDemand(
        \App\Notifications\PaymentReceiptMailNotification::class,
        function (\App\Notifications\PaymentReceiptMailNotification $notification) use ($payment): bool {
            return $notification->payment->is($payment)
                && str_starts_with($notification->pdfBinary, '%PDF');
        },
    );
});

test('dossier checklist detects missing pieces from filenames and photo', function () {
    $incomplete = DossierChecklist::evaluate(null, [
        ['name' => 'releve-notes.pdf'],
    ]);

    expect($incomplete['complete'])->toBeFalse()
        ->and($incomplete['missing'])->toContain('extrait_naissance', 'photo_identite');

    $complete = DossierChecklist::evaluate('/storage/photo.jpg', [
        ['name' => 'Extrait de naissance.pdf'],
        ['name' => 'carnet-vaccination.jpg'],
        ['name' => 'Certificat médical.pdf'],
    ]);

    expect($complete['complete'])->toBeTrue()
        ->and($complete['missing'])->toBe([]);
});
