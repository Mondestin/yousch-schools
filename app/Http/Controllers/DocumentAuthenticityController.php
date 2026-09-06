<?php

namespace App\Http\Controllers;

use App\Enums\DocumentKind;
use App\Models\Payment;
use App\Models\Student;
use App\Support\Documents\DocumentAuthenticity;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DocumentAuthenticityController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::enum(DocumentKind::class)],
            'studentId' => ['required', 'string'],
            'refId' => ['nullable', 'string'],
            'termId' => ['nullable', 'string'],
            'academicYearId' => ['nullable', 'string'],
            'issuedOn' => ['nullable', 'date_format:Y-m-d'],
        ]);

        abort_unless(CurrentSchool::check(), 403);

        $student = Student::query()->find($validated['studentId']);
        abort_unless($student !== null, 404, 'Élève introuvable.');

        $type = DocumentKind::from($validated['type']);

        if ($type === DocumentKind::PaymentReceipt) {
            abort_unless(isset($validated['refId']), 422, 'Paiement requis.');
            $payment = Payment::query()->with('enrollment')->find($validated['refId']);
            abort_unless(
                $payment !== null && $payment->enrollment?->student_id === $student->id,
                404,
                'Paiement introuvable.',
            );
        }

        $url = DocumentAuthenticity::url([
            'type' => $type,
            'studentId' => $student->id,
            'refId' => $validated['refId'] ?? null,
            'termId' => $validated['termId'] ?? null,
            'academicYearId' => $validated['academicYearId'] ?? null,
            'issuedOn' => $validated['issuedOn'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'url' => $url,
        ]);
    }
}
