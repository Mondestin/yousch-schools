<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\DocumentTemplate;
use App\Models\IssuedDocument;
use App\Support\Documents\IssuedDocumentService;
use App\Support\SchoolCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SchoolPagesController extends Controller
{
    public function welcome(): Response
    {
        return Inertia::render('welcome', SchoolCatalog::page());
    }

    public function dashboard(): Response
    {
        return Inertia::render('dashboard', SchoolCatalog::page());
    }

    public function students(): Response
    {
        return Inertia::render('students/index', SchoolCatalog::page());
    }

    public function createStudent(): Response
    {
        return Inertia::render('students/create', SchoolCatalog::page());
    }

    public function admissions(): Response
    {
        return Inertia::render('students/admissions', SchoolCatalog::page());
    }

    public function reenrollments(): Response
    {
        return Inertia::render('students/reenrollments', SchoolCatalog::page());
    }

    public function student(Request $request, string $student): RedirectResponse
    {
        $this->ensureStudent($student);

        return redirect()->route('students.show', [
            'student' => $student,
            ...$request->query(),
        ]);
    }

    public function showStudent(string $student): Response
    {
        return $this->studentPage($student, 'students/identity');
    }

    public function studentGuardians(string $student): Response
    {
        return $this->studentPage($student, 'students/guardians');
    }

    public function studentGrades(string $student): Response
    {
        return $this->studentPage($student, 'students/grades');
    }

    public function studentPayments(string $student): Response
    {
        return $this->studentPage($student, 'students/payments');
    }

    public function studentDocuments(string $student): Response
    {
        $this->ensureStudent($student);

        $documents = IssuedDocument::query()
            ->with(['student', 'academicYear'])
            ->where('student_id', $student)
            ->orderByDesc('issued_on')
            ->orderByDesc('created_at')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        $requests = DocumentRequest::query()
            ->with(['student', 'academicYear', 'requester'])
            ->where('student_id', $student)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return Inertia::render('students/documents', [
            ...SchoolCatalog::page(),
            'studentId' => $student,
            'issuedDocuments' => $documents,
            'documentRequests' => $requests,
        ]);
    }

    public function studentDiscipline(string $student): Response
    {
        return $this->studentPage($student, 'students/discipline');
    }

    public function guardians(): Response
    {
        return Inertia::render('guardians/index', SchoolCatalog::page());
    }

    public function showGuardian(string $guardian): Response
    {
        $guardians = SchoolCatalog::dataset()['guardians'] ?? [];
        $exists = is_array($guardians) && collect($guardians)->contains('id', $guardian);

        abort_unless($exists, 404);

        return Inertia::render('guardians/show', [
            ...SchoolCatalog::page(),
            'guardianId' => $guardian,
        ]);
    }

    public function teachers(): Response
    {
        return Inertia::render('teachers/index', SchoolCatalog::page());
    }

    public function createTeacher(): Response
    {
        return Inertia::render('teachers/create', SchoolCatalog::page());
    }

    public function teacher(Request $request, string $teacher): RedirectResponse
    {
        $this->ensureTeacher($teacher);

        return redirect()->route('teachers.show', [
            'teacher' => $teacher,
            ...$request->query(),
        ]);
    }

    public function showTeacher(string $teacher): Response
    {
        return $this->teacherPage($teacher, 'teachers/identity');
    }

    public function teacherDossier(string $teacher): Response
    {
        return $this->teacherPage($teacher, 'teachers/dossier');
    }

    public function teacherAssignments(string $teacher): Response
    {
        return $this->teacherPage($teacher, 'teachers/assignments');
    }

    public function subjects(): Response
    {
        return Inertia::render('subjects/index', SchoolCatalog::page());
    }

    public function timetable(): Response
    {
        return Inertia::render('timetable/index', SchoolCatalog::page());
    }

    public function attendance(): Response
    {
        return Inertia::render('attendance/index', SchoolCatalog::page());
    }

    public function results(): Response
    {
        return Inertia::render('results/index', SchoolCatalog::page());
    }

    public function inventory(): Response
    {
        return Inertia::render('inventory/index', SchoolCatalog::page());
    }

    public function cashDesk(Request $request): RedirectResponse
    {
        return redirect()->route('payments.index', $request->query());
    }

    public function cash(): Response
    {
        return Inertia::render('cash/index', SchoolCatalog::page());
    }

    public function announcements(): Response
    {
        return Inertia::render('announcements/index', SchoolCatalog::page());
    }

    public function documents(IssuedDocumentService $issuedDocuments): Response
    {
        $issuedDocuments->ensureDefaultTemplates();

        $documents = IssuedDocument::query()
            ->with(['student', 'academicYear'])
            ->orderByDesc('issued_on')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return Inertia::render('documents/index', [
            ...SchoolCatalog::page(),
            'issuedDocuments' => $documents,
        ]);
    }

    public function documentRequests(): Response
    {
        $requests = DocumentRequest::query()
            ->with(['student', 'academicYear', 'requester'])
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return Inertia::render('documents/requests', [
            ...SchoolCatalog::page(),
            'documentRequests' => $requests,
        ]);
    }

    public function documentTemplates(IssuedDocumentService $issuedDocuments): Response
    {
        $issuedDocuments->ensureDefaultTemplates();

        $templates = DocumentTemplate::query()
            ->orderBy('kind')
            ->orderBy('title')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return Inertia::render('documents/templates', [
            ...SchoolCatalog::page(),
            'documentTemplates' => $templates,
        ]);
    }

    public function assessments(): Response
    {
        return Inertia::render('assessments/index', SchoolCatalog::page());
    }

    public function assessmentEntry(): Response
    {
        return Inertia::render('assessments/entry', SchoolCatalog::page());
    }

    public function assessmentControl(): Response
    {
        return Inertia::render('assessments/control', SchoolCatalog::page());
    }

    public function reports(): Response
    {
        return Inertia::render('reports/index', SchoolCatalog::page());
    }

    public function showReport(Request $request, string $student): Response
    {
        $this->ensureStudent($student);

        $term = $request->query('trimestre');

        return Inertia::render('reports/show', [
            ...SchoolCatalog::page(),
            'studentId' => $student,
            'termId' => is_string($term) ? $term : null,
        ]);
    }

    public function payments(): Response
    {
        return Inertia::render('payments/index', SchoolCatalog::page());
    }

    public function showPayment(string $student): Response
    {
        $this->ensureStudent($student);

        return Inertia::render('payments/show', [
            ...SchoolCatalog::page(),
            'studentId' => $student,
        ]);
    }

    public function paymentReceipt(string $student, string $payment): Response
    {
        $this->ensurePayment($student, $payment);

        return Inertia::render('payments/receipt', [
            ...SchoolCatalog::page(),
            'studentId' => $student,
            'paymentId' => $payment,
        ]);
    }

    public function staffUsers(): Response
    {
        return Inertia::render('staff/index', SchoolCatalog::page());
    }

    public function structure(Request $request): RedirectResponse
    {
        return redirect()->route('structure.index', $request->query());
    }

    public function years(): Response
    {
        return Inertia::render('structure/years', SchoolCatalog::page());
    }

    public function classes(): Response
    {
        return Inertia::render('structure/classes', SchoolCatalog::page());
    }

    public function tracks(): Response
    {
        return Inertia::render('structure/tracks', SchoolCatalog::page());
    }

    public function venues(): Response
    {
        return Inertia::render('structure/venues', SchoolCatalog::page());
    }

    public function hours(): Response
    {
        return Inertia::render('structure/hours', SchoolCatalog::page());
    }

    public function school(): Response
    {
        return Inertia::render('etablissement/profile', SchoolCatalog::page());
    }

    public function fees(): Response
    {
        return Inertia::render('etablissement/fees', SchoolCatalog::page());
    }

    public function subscription(): Response
    {
        return Inertia::render('organisation/subscription', SchoolCatalog::page());
    }

    private function studentPage(string $student, string $component): Response
    {
        $this->ensureStudent($student);

        return Inertia::render($component, [
            ...SchoolCatalog::page(),
            'studentId' => $student,
        ]);
    }

    private function teacherPage(string $teacher, string $component): Response
    {
        $this->ensureTeacher($teacher);

        return Inertia::render($component, [
            ...SchoolCatalog::page(),
            'teacherId' => $teacher,
        ]);
    }

    private function ensureStudent(string $student): void
    {
        $students = SchoolCatalog::dataset()['students'] ?? [];
        $exists = is_array($students) && collect($students)->contains('id', $student);

        abort_unless($exists, 404);
    }

    private function ensureTeacher(string $teacher): void
    {
        $teachers = SchoolCatalog::dataset()['teachers'] ?? [];
        $exists = is_array($teachers) && collect($teachers)->contains('id', $teacher);

        abort_unless($exists, 404);
    }

    private function ensurePayment(string $student, string $payment): void
    {
        $this->ensureStudent($student);

        $dataset = SchoolCatalog::dataset();
        $enrollments = $dataset['enrollments'] ?? [];
        $payments = $dataset['payments'] ?? [];

        $enrollmentIds = is_array($enrollments)
            ? collect($enrollments)->where('studentId', $student)->pluck('id')
            : collect();
        $exists = is_array($payments) && collect($payments)->contains(
            fn (array $row) => $row['id'] === $payment && $enrollmentIds->contains($row['enrollmentId']),
        );

        abort_unless($exists, 404);
    }
}
