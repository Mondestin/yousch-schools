<?php

use App\Http\Controllers\Auth\SchoolDomainLoginController;
use App\Http\Controllers\Auth\SchoolRegistrationController;
use App\Http\Controllers\DocumentAuthenticityController;
use App\Http\Controllers\DocumentVerifyController;
use App\Http\Controllers\SchoolPagesController;
use Illuminate\Support\Facades\Route;

Route::get('/', [SchoolPagesController::class, 'welcome'])->name('home');

Route::get('v/{token}', [DocumentVerifyController::class, 'show'])
    ->where('token', '[A-Za-z0-9\-_\.]+')
    ->middleware('throttle:60,1')
    ->name('documents.verify');

Route::middleware('guest')->group(function () {
    Route::get('register', [SchoolRegistrationController::class, 'create'])
        ->name('register');
    Route::post('register', [SchoolRegistrationController::class, 'store'])
        ->name('register.store');

    Route::post('login/domain', [SchoolDomainLoginController::class, 'store'])
        ->name('login.domain.resolve');
    Route::get('login/domain/{domain}', [SchoolDomainLoginController::class, 'show'])
        ->name('login.domain');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('documents/authenticity', [DocumentAuthenticityController::class, 'store'])
        ->name('documents.authenticity');

    Route::get('dashboard', [SchoolPagesController::class, 'dashboard'])->name('dashboard');
    Route::get('eleves', [SchoolPagesController::class, 'students'])->name('students.index');
    Route::get('eleves/inscription', [SchoolPagesController::class, 'createStudent'])->name('students.create');
    Route::get('eleves/admissions', [SchoolPagesController::class, 'admissions'])->name('students.admissions');
    Route::get('eleves/reinscriptions', [SchoolPagesController::class, 'reenrollments'])->name('students.reenrollments');
    Route::get('eleves/{student}', [SchoolPagesController::class, 'student']);
    Route::get('eleves/{student}/identite', [SchoolPagesController::class, 'showStudent'])->name('students.show');
    Route::get('eleves/{student}/tuteurs', [SchoolPagesController::class, 'studentGuardians'])->name('students.guardians');
    Route::get('eleves/{student}/notes', [SchoolPagesController::class, 'studentGrades'])->name('students.grades');
    Route::get('eleves/{student}/paiements', [SchoolPagesController::class, 'studentPayments'])->name('students.payments');
    Route::get('eleves/{student}/documents', [SchoolPagesController::class, 'studentDocuments'])->name('students.documents');
    Route::get('eleves/{student}/discipline', [SchoolPagesController::class, 'studentDiscipline'])->name('students.discipline');
    Route::get('tuteurs', [SchoolPagesController::class, 'guardians'])->name('guardians.index');
    Route::get('tuteurs/{guardian}', [SchoolPagesController::class, 'showGuardian'])->name('guardians.show');
    Route::get('enseignants', [SchoolPagesController::class, 'teachers'])->name('teachers.index');
    Route::get('enseignants/nouveau', [SchoolPagesController::class, 'createTeacher'])->name('teachers.create');
    Route::get('enseignants/{teacher}', [SchoolPagesController::class, 'showTeacher'])->name('teachers.show');
    Route::get('matieres', [SchoolPagesController::class, 'subjects'])->name('subjects.index');
    Route::get('emploi-du-temps', [SchoolPagesController::class, 'timetable'])->name('timetable.index');
    Route::get('presences', [SchoolPagesController::class, 'attendance'])->name('attendance.index');
    Route::get('evaluations', [SchoolPagesController::class, 'assessments'])->name('assessments.index');
    Route::get('evaluations/saisie', [SchoolPagesController::class, 'assessmentEntry'])->name('assessments.entry');
    Route::get('evaluations/controle', [SchoolPagesController::class, 'assessmentControl'])->name('assessments.control');
    Route::get('bulletins', [SchoolPagesController::class, 'reports'])->name('reports.index');
    Route::get('bulletins/{student}', [SchoolPagesController::class, 'showReport'])->name('reports.show');
    Route::get('resultats', [SchoolPagesController::class, 'results'])->name('results.index');
    Route::get('caisse', [SchoolPagesController::class, 'cashDesk']);
    Route::get('caisse/frais', [SchoolPagesController::class, 'payments'])->name('payments.index');
    Route::get('caisse/frais/{student}/recu/{payment}', [SchoolPagesController::class, 'paymentReceipt'])->name('payments.receipt');
    Route::get('caisse/frais/{student}', [SchoolPagesController::class, 'showPayment'])->name('payments.show');
    Route::get('caisse/mouvements', [SchoolPagesController::class, 'cash'])->name('cash.index');
    Route::get('paiements', fn () => redirect()->route('payments.index'));
    Route::get('paiements/{student}/recu/{payment}', function (string $student, string $payment) {
        return redirect()->route('payments.receipt', ['student' => $student, 'payment' => $payment]);
    });
    Route::get('paiements/{student}', function (string $student) {
        return redirect()->route('payments.show', ['student' => $student]);
    });
    Route::get('materiel', [SchoolPagesController::class, 'inventory'])->name('inventory.index');
    Route::get('annonces', [SchoolPagesController::class, 'announcements'])->name('announcements.index');
    Route::get('documents', [SchoolPagesController::class, 'documents'])->name('documents.index');
    Route::get('documents/demandes', [SchoolPagesController::class, 'documentRequests'])->name('documents.requests');
    Route::get('documents/modeles', [SchoolPagesController::class, 'documentTemplates'])->name('documents.templates');
    Route::get('utilisateurs', [SchoolPagesController::class, 'staffUsers'])->name('staff.index');
    Route::get('structure', [SchoolPagesController::class, 'structure']);
    Route::get('structure/annees', [SchoolPagesController::class, 'years'])->name('structure.index');
    Route::get('structure/classes', [SchoolPagesController::class, 'classes'])->name('structure.classes');
    Route::get('structure/series', [SchoolPagesController::class, 'tracks'])->name('structure.tracks');
    Route::get('structure/salles', [SchoolPagesController::class, 'venues'])->name('structure.venues');
    Route::get('structure/horaires', [SchoolPagesController::class, 'hours'])->name('structure.hours');
    Route::redirect('etablissement', '/etablissement/identite');
    Route::get('etablissement/identite', [SchoolPagesController::class, 'school'])->name('etablissement.index');
    Route::get('etablissement/frais', [SchoolPagesController::class, 'fees'])->name('etablissement.fees');
    Route::get('etablissement/abonnement', [SchoolPagesController::class, 'subscription'])->name('etablissement.subscription');
});

require __DIR__.'/settings.php';
