<?php

use App\Http\Controllers\Api\V1\AcademicYearController;
use App\Http\Controllers\Api\V1\AdmissionController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AssessmentController;
use App\Http\Controllers\Api\V1\AttendanceMarkController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CashMovementController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\ClassroomController;
use App\Http\Controllers\Api\V1\CycleScheduleController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\EnrollmentController;
use App\Http\Controllers\Api\V1\FeeTariffController;
use App\Http\Controllers\Api\V1\GradeController;
use App\Http\Controllers\Api\V1\GuardianController;
use App\Http\Controllers\Api\V1\InventoryItemController;
use App\Http\Controllers\Api\V1\MetaController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ReenrollmentController;
use App\Http\Controllers\Api\V1\ResultsController;
use App\Http\Controllers\Api\V1\SanctionController;
use App\Http\Controllers\Api\V1\SchoolProfileController;
use App\Http\Controllers\Api\V1\StaffController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use App\Http\Controllers\Api\V1\TeacherAssignmentController;
use App\Http\Controllers\Api\V1\TeacherController;
use App\Http\Controllers\Api\V1\TermController;
use App\Http\Controllers\Api\V1\TimetableSlotController;
use App\Http\Controllers\Api\V1\TrackController;
use App\Http\Controllers\Api\V1\VenueController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/meta/contract', [MetaController::class, 'contract'])
        ->name('api.v1.meta.contract');
    Route::get('/meta/enums', [MetaController::class, 'enums'])
        ->name('api.v1.meta.enums');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:api-login')
        ->name('api.v1.login');

    Route::middleware('auth.staff')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout'])
            ->name('api.v1.logout');
        Route::get('/me', [AuthController::class, 'me'])
            ->name('api.v1.me');
        Route::get('/subscription', [SubscriptionController::class, 'show'])
            ->name('api.v1.subscription');
        Route::get('/catalog', [CatalogController::class, 'show'])
            ->name('api.v1.catalog');

        Route::get('/school/profile', [SchoolProfileController::class, 'show'])
            ->name('api.v1.school.profile.show');
        Route::put('/school/profile', [SchoolProfileController::class, 'update'])
            ->name('api.v1.school.profile.update');
        Route::post('/school/profile', [SchoolProfileController::class, 'update'])
            ->name('api.v1.school.profile.update.post');

        Route::get('/school/fees', [FeeTariffController::class, 'index'])
            ->name('api.v1.school.fees.index');
        Route::put('/school/fees', [FeeTariffController::class, 'upsert'])
            ->name('api.v1.school.fees.upsert');

        Route::get('/school/schedules', [CycleScheduleController::class, 'index'])
            ->name('api.v1.school.schedules.index');
        Route::put('/school/schedules', [CycleScheduleController::class, 'upsert'])
            ->name('api.v1.school.schedules.upsert');

        Route::get('/school/venues', [VenueController::class, 'index'])
            ->name('api.v1.school.venues.index');
        Route::post('/school/venues', [VenueController::class, 'store'])
            ->name('api.v1.school.venues.store');
        Route::put('/school/venues/{venue}', [VenueController::class, 'update'])
            ->name('api.v1.school.venues.update');
        Route::delete('/school/venues/{venue}', [VenueController::class, 'destroy'])
            ->name('api.v1.school.venues.destroy');

        Route::get('/academic-years', [AcademicYearController::class, 'index'])
            ->name('api.v1.academic-years.index');
        Route::post('/academic-years', [AcademicYearController::class, 'store'])
            ->name('api.v1.academic-years.store');
        Route::put('/academic-years/{academicYear}', [AcademicYearController::class, 'update'])
            ->name('api.v1.academic-years.update');
        Route::delete('/academic-years/{academicYear}', [AcademicYearController::class, 'destroy'])
            ->name('api.v1.academic-years.destroy');

        Route::get('/terms', [TermController::class, 'index'])
            ->name('api.v1.terms.index');
        Route::post('/terms', [TermController::class, 'store'])
            ->name('api.v1.terms.store');
        Route::put('/terms/{term}', [TermController::class, 'update'])
            ->name('api.v1.terms.update');
        Route::delete('/terms/{term}', [TermController::class, 'destroy'])
            ->name('api.v1.terms.destroy');

        Route::get('/classrooms', [ClassroomController::class, 'index'])
            ->name('api.v1.classrooms.index');
        Route::post('/classrooms', [ClassroomController::class, 'store'])
            ->name('api.v1.classrooms.store');
        Route::put('/classrooms/{classroom}', [ClassroomController::class, 'update'])
            ->name('api.v1.classrooms.update');
        Route::delete('/classrooms/{classroom}', [ClassroomController::class, 'destroy'])
            ->name('api.v1.classrooms.destroy');

        Route::get('/tracks', [TrackController::class, 'index'])
            ->name('api.v1.tracks.index');
        Route::post('/tracks', [TrackController::class, 'store'])
            ->name('api.v1.tracks.store');
        Route::put('/tracks/{track}', [TrackController::class, 'update'])
            ->name('api.v1.tracks.update');
        Route::delete('/tracks/{track}', [TrackController::class, 'destroy'])
            ->name('api.v1.tracks.destroy');

        Route::get('/students', [StudentController::class, 'index'])
            ->name('api.v1.students.index');
        Route::post('/students', [StudentController::class, 'store'])
            ->name('api.v1.students.store');
        Route::get('/students/{student}', [StudentController::class, 'show'])
            ->name('api.v1.students.show');
        Route::put('/students/{student}', [StudentController::class, 'update'])
            ->name('api.v1.students.update');
        Route::post('/students/{student}', [StudentController::class, 'update'])
            ->name('api.v1.students.update.post');
        Route::delete('/students/{student}', [StudentController::class, 'destroy'])
            ->name('api.v1.students.destroy');

        Route::get('/enrollments', [EnrollmentController::class, 'index'])
            ->name('api.v1.enrollments.index');
        Route::post('/enrollments', [EnrollmentController::class, 'store'])
            ->name('api.v1.enrollments.store');
        Route::put('/enrollments/{enrollment}', [EnrollmentController::class, 'update'])
            ->name('api.v1.enrollments.update');
        Route::delete('/enrollments/{enrollment}', [EnrollmentController::class, 'destroy'])
            ->name('api.v1.enrollments.destroy');

        Route::get('/guardians', [GuardianController::class, 'index'])
            ->name('api.v1.guardians.index');
        Route::post('/guardians', [GuardianController::class, 'store'])
            ->name('api.v1.guardians.store');
        Route::get('/guardians/{guardian}', [GuardianController::class, 'show'])
            ->name('api.v1.guardians.show');
        Route::put('/guardians/{guardian}', [GuardianController::class, 'update'])
            ->name('api.v1.guardians.update');
        Route::delete('/guardians/{guardian}', [GuardianController::class, 'destroy'])
            ->name('api.v1.guardians.destroy');
        Route::post('/guardians/{guardian}/students', [GuardianController::class, 'attachStudent'])
            ->name('api.v1.guardians.attach-student');
        Route::delete('/guardians/{guardian}/students/{student}', [GuardianController::class, 'detachStudent'])
            ->name('api.v1.guardians.detach-student');

        Route::get('/admissions', [AdmissionController::class, 'index'])
            ->name('api.v1.admissions.index');
        Route::post('/admissions', [AdmissionController::class, 'store'])
            ->name('api.v1.admissions.store');
        Route::get('/admissions/{admission}', [AdmissionController::class, 'show'])
            ->name('api.v1.admissions.show');
        Route::put('/admissions/{admission}', [AdmissionController::class, 'update'])
            ->name('api.v1.admissions.update');
        Route::patch('/admissions/{admission}/status', [AdmissionController::class, 'updateStatus'])
            ->name('api.v1.admissions.status');
        Route::delete('/admissions/{admission}', [AdmissionController::class, 'destroy'])
            ->name('api.v1.admissions.destroy');

        Route::get('/reenrollments', [ReenrollmentController::class, 'index'])
            ->name('api.v1.reenrollments.index');
        Route::post('/reenrollments', [ReenrollmentController::class, 'store'])
            ->name('api.v1.reenrollments.store');
        Route::get('/reenrollments/{reenrollment}', [ReenrollmentController::class, 'show'])
            ->name('api.v1.reenrollments.show');
        Route::put('/reenrollments/{reenrollment}', [ReenrollmentController::class, 'update'])
            ->name('api.v1.reenrollments.update');
        Route::patch('/reenrollments/{reenrollment}/status', [ReenrollmentController::class, 'updateStatus'])
            ->name('api.v1.reenrollments.status');
        Route::delete('/reenrollments/{reenrollment}', [ReenrollmentController::class, 'destroy'])
            ->name('api.v1.reenrollments.destroy');

        Route::get('/teachers', [TeacherController::class, 'index'])
            ->name('api.v1.teachers.index');
        Route::post('/teachers', [TeacherController::class, 'store'])
            ->name('api.v1.teachers.store');
        Route::get('/teachers/{teacher}', [TeacherController::class, 'show'])
            ->name('api.v1.teachers.show');
        Route::put('/teachers/{teacher}', [TeacherController::class, 'update'])
            ->name('api.v1.teachers.update');
        Route::post('/teachers/{teacher}', [TeacherController::class, 'update'])
            ->name('api.v1.teachers.update.post');
        Route::delete('/teachers/{teacher}', [TeacherController::class, 'destroy'])
            ->name('api.v1.teachers.destroy');

        Route::get('/subjects', [SubjectController::class, 'index'])
            ->name('api.v1.subjects.index');
        Route::post('/subjects', [SubjectController::class, 'store'])
            ->name('api.v1.subjects.store');
        Route::get('/subjects/{subject}', [SubjectController::class, 'show'])
            ->name('api.v1.subjects.show');
        Route::put('/subjects/{subject}', [SubjectController::class, 'update'])
            ->name('api.v1.subjects.update');
        Route::post('/subjects/{subject}', [SubjectController::class, 'update'])
            ->name('api.v1.subjects.update.post');
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy'])
            ->name('api.v1.subjects.destroy');

        Route::get('/teacher-assignments', [TeacherAssignmentController::class, 'index'])
            ->name('api.v1.teacher-assignments.index');
        Route::post('/teacher-assignments', [TeacherAssignmentController::class, 'store'])
            ->name('api.v1.teacher-assignments.store');
        Route::put('/teacher-assignments/{teacherAssignment}', [TeacherAssignmentController::class, 'update'])
            ->name('api.v1.teacher-assignments.update');
        Route::delete('/teacher-assignments/{teacherAssignment}', [TeacherAssignmentController::class, 'destroy'])
            ->name('api.v1.teacher-assignments.destroy');

        Route::get('/timetable-slots', [TimetableSlotController::class, 'index'])
            ->name('api.v1.timetable-slots.index');
        Route::post('/timetable-slots', [TimetableSlotController::class, 'store'])
            ->name('api.v1.timetable-slots.store');
        Route::put('/timetable-slots/{timetableSlot}', [TimetableSlotController::class, 'update'])
            ->name('api.v1.timetable-slots.update');
        Route::delete('/timetable-slots/{timetableSlot}', [TimetableSlotController::class, 'destroy'])
            ->name('api.v1.timetable-slots.destroy');

        Route::get('/attendance', [AttendanceMarkController::class, 'index'])
            ->name('api.v1.attendance.index');
        Route::put('/attendance', [AttendanceMarkController::class, 'upsert'])
            ->name('api.v1.attendance.upsert');
        Route::delete('/attendance/{attendanceMark}', [AttendanceMarkController::class, 'destroy'])
            ->name('api.v1.attendance.destroy');

        Route::get('/assessments', [AssessmentController::class, 'index'])
            ->name('api.v1.assessments.index');
        Route::post('/assessments', [AssessmentController::class, 'store'])
            ->name('api.v1.assessments.store');
        Route::get('/assessments/{assessment}', [AssessmentController::class, 'show'])
            ->name('api.v1.assessments.show');
        Route::put('/assessments/{assessment}', [AssessmentController::class, 'update'])
            ->name('api.v1.assessments.update');
        Route::delete('/assessments/{assessment}', [AssessmentController::class, 'destroy'])
            ->name('api.v1.assessments.destroy');

        Route::get('/grades', [GradeController::class, 'index'])
            ->name('api.v1.grades.index');
        Route::put('/grades', [GradeController::class, 'upsert'])
            ->name('api.v1.grades.upsert');
        Route::delete('/grades/{grade}', [GradeController::class, 'destroy'])
            ->name('api.v1.grades.destroy');

        Route::get('/students/{student}/bulletin', [ResultsController::class, 'bulletin'])
            ->name('api.v1.students.bulletin');
        Route::get('/classrooms/{classroom}/results', [ResultsController::class, 'classResults'])
            ->name('api.v1.classrooms.results');

        Route::get('/payments', [PaymentController::class, 'index'])
            ->name('api.v1.payments.index');
        Route::post('/payments', [PaymentController::class, 'store'])
            ->name('api.v1.payments.store');
        Route::get('/payments/{payment}', [PaymentController::class, 'show'])
            ->name('api.v1.payments.show');
        Route::put('/payments/{payment}', [PaymentController::class, 'update'])
            ->name('api.v1.payments.update');
        Route::delete('/payments/{payment}', [PaymentController::class, 'destroy'])
            ->name('api.v1.payments.destroy');
        Route::get('/students/{student}/receipt', [PaymentController::class, 'receipt'])
            ->name('api.v1.students.receipt');

        Route::get('/cash-movements', [CashMovementController::class, 'index'])
            ->name('api.v1.cash-movements.index');
        Route::post('/cash-movements', [CashMovementController::class, 'store'])
            ->name('api.v1.cash-movements.store');
        Route::put('/cash-movements/{cashMovement}', [CashMovementController::class, 'update'])
            ->name('api.v1.cash-movements.update');
        Route::delete('/cash-movements/{cashMovement}', [CashMovementController::class, 'destroy'])
            ->name('api.v1.cash-movements.destroy');

        Route::get('/inventory', [InventoryItemController::class, 'index'])
            ->name('api.v1.inventory.index');
        Route::post('/inventory', [InventoryItemController::class, 'store'])
            ->name('api.v1.inventory.store');
        Route::put('/inventory/{inventoryItem}', [InventoryItemController::class, 'update'])
            ->name('api.v1.inventory.update');
        Route::delete('/inventory/{inventoryItem}', [InventoryItemController::class, 'destroy'])
            ->name('api.v1.inventory.destroy');

        Route::get('/announcements', [AnnouncementController::class, 'index'])
            ->name('api.v1.announcements.index');
        Route::post('/announcements', [AnnouncementController::class, 'store'])
            ->name('api.v1.announcements.store');
        Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update'])
            ->name('api.v1.announcements.update');
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy'])
            ->name('api.v1.announcements.destroy');

        Route::get('/sanctions', [SanctionController::class, 'index'])
            ->name('api.v1.sanctions.index');
        Route::post('/sanctions', [SanctionController::class, 'store'])
            ->name('api.v1.sanctions.store');
        Route::put('/sanctions/{sanction}', [SanctionController::class, 'update'])
            ->name('api.v1.sanctions.update');
        Route::delete('/sanctions/{sanction}', [SanctionController::class, 'destroy'])
            ->name('api.v1.sanctions.destroy');

        Route::get('/staff', [StaffController::class, 'index'])
            ->name('api.v1.staff.index');
        Route::post('/staff', [StaffController::class, 'store'])
            ->name('api.v1.staff.store');
        Route::put('/staff/{staff}', [StaffController::class, 'update'])
            ->name('api.v1.staff.update');
        Route::delete('/staff/{staff}', [StaffController::class, 'destroy'])
            ->name('api.v1.staff.destroy');

        Route::get('/students/{student}/documents', [DocumentController::class, 'show'])
            ->name('api.v1.students.documents');
        Route::get('/students/{student}/files', [DocumentController::class, 'files'])
            ->name('api.v1.students.files');
    });
});
