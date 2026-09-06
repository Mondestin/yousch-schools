<?php

namespace App\Support\Documents;

use App\Enums\DocumentKind;
use App\Models\AcademicYear;
use App\Models\Payment;
use App\Models\School;
use App\Models\Student;
use App\Models\Term;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Facades\URL;
use RuntimeException;

final class DocumentAuthenticity
{
    private const VERSION = 1;

    /**
     * @param  array{
     *     type: DocumentKind|string,
     *     studentId: string,
     *     refId?: string|null,
     *     termId?: string|null,
     *     academicYearId?: string|null,
     *     issuedOn?: string|null
     * }  $claims
     */
    public static function issue(array $claims, ?School $school = null): string
    {
        $school ??= CurrentSchool::get();

        if ($school === null) {
            throw new RuntimeException('Aucun établissement n’est résolu pour signer le document.');
        }

        $type = $claims['type'] instanceof DocumentKind
            ? $claims['type']
            : DocumentKind::from((string) $claims['type']);

        $payload = [
            'v' => self::VERSION,
            's' => $school->id,
            't' => $type->value,
            'sid' => $claims['studentId'],
            'rid' => $claims['refId'] ?? null,
            'tid' => $claims['termId'] ?? null,
            'yid' => $claims['academicYearId'] ?? null,
            'i' => $claims['issuedOn'] ?? now()->toDateString(),
        ];

        $body = self::base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = self::base64UrlEncode(hash_hmac('sha256', $body, self::secret(), true));

        return $body.'.'.$signature;
    }

    /**
     * @param  array{
     *     type: DocumentKind|string,
     *     studentId: string,
     *     refId?: string|null,
     *     termId?: string|null,
     *     academicYearId?: string|null,
     *     issuedOn?: string|null
     * }  $claims
     */
    public static function url(array $claims, ?School $school = null): string
    {
        return URL::route('documents.verify', [
            'token' => self::issue($claims, $school),
        ], absolute: true);
    }

    /**
     * @return array{
     *     valid: bool,
     *     reason?: string,
     *     kind?: DocumentKind,
     *     kindLabel?: string,
     *     issuedOn?: string,
     *     school?: array{id: string, name: string, domain: string},
     *     student?: array{id: string, matricule: string, name: string},
     *     term?: array{id: string, name: string}|null,
     *     academicYear?: array{id: string, label: string}|null,
     *     payment?: array{id: string, amount: int, paidOn: string|null}|null
     * }
     */
    public static function verify(string $token): array
    {
        $parts = explode('.', $token, 2);

        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return ['valid' => false, 'reason' => 'Jeton invalide.'];
        }

        [$body, $signature] = $parts;
        $expected = self::base64UrlEncode(hash_hmac('sha256', $body, self::secret(), true));

        if (! hash_equals($expected, $signature)) {
            return ['valid' => false, 'reason' => 'Signature incorrecte.'];
        }

        try {
            $decoded = json_decode(self::base64UrlDecode($body), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return ['valid' => false, 'reason' => 'Jeton illisible.'];
        }

        if (! is_array($decoded) || (int) ($decoded['v'] ?? 0) !== self::VERSION) {
            return ['valid' => false, 'reason' => 'Version de jeton non supportée.'];
        }

        $schoolId = (string) ($decoded['s'] ?? '');
        $typeValue = (string) ($decoded['t'] ?? '');
        $studentId = (string) ($decoded['sid'] ?? '');

        if ($schoolId === '' || $studentId === '' || $typeValue === '') {
            return ['valid' => false, 'reason' => 'Jeton incomplet.'];
        }

        try {
            $kind = DocumentKind::from($typeValue);
        } catch (\ValueError) {
            return ['valid' => false, 'reason' => 'Type de document inconnu.'];
        }

        $school = School::query()->find($schoolId);

        if ($school === null || $school->status !== 'active') {
            return ['valid' => false, 'reason' => 'Établissement introuvable.'];
        }

        CurrentSchool::set($school);

        $student = Student::query()->find($studentId);

        if ($student === null) {
            return ['valid' => false, 'reason' => 'Élève introuvable pour cet établissement.'];
        }

        $termId = isset($decoded['tid']) && is_string($decoded['tid']) ? $decoded['tid'] : null;
        $yearId = isset($decoded['yid']) && is_string($decoded['yid']) ? $decoded['yid'] : null;
        $refId = isset($decoded['rid']) && is_string($decoded['rid']) ? $decoded['rid'] : null;
        $issuedOn = isset($decoded['i']) && is_string($decoded['i']) ? $decoded['i'] : null;

        $term = null;
        if ($termId !== null) {
            $termModel = Term::query()->find($termId);
            if ($termModel !== null) {
                $term = ['id' => $termModel->id, 'name' => $termModel->name];
            }
        }

        $academicYear = null;
        if ($yearId !== null) {
            $yearModel = AcademicYear::query()->find($yearId);
            if ($yearModel !== null) {
                $academicYear = ['id' => $yearModel->id, 'label' => $yearModel->label];
            }
        }

        $payment = null;
        if ($kind === DocumentKind::PaymentReceipt && $refId !== null) {
            $paymentModel = Payment::query()->with('enrollment')->find($refId);
            if ($paymentModel === null || $paymentModel->enrollment?->student_id !== $student->id) {
                return ['valid' => false, 'reason' => 'Paiement introuvable pour ce document.'];
            }

            $payment = [
                'id' => $paymentModel->id,
                'amount' => (int) $paymentModel->amount,
                'paidOn' => $paymentModel->paid_on?->format('Y-m-d'),
            ];
        }

        return [
            'valid' => true,
            'kind' => $kind,
            'kindLabel' => $kind->label(),
            'issuedOn' => $issuedOn,
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'domain' => $school->domain,
            ],
            'student' => [
                'id' => $student->id,
                'matricule' => $student->matricule,
                'name' => trim($student->last_name.' '.$student->first_name),
            ],
            'term' => $term,
            'academicYear' => $academicYear,
            'payment' => $payment,
        ];
    }

    private static function secret(): string
    {
        $key = (string) config('app.key');

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);

            if (is_string($decoded) && $decoded !== '') {
                return $decoded;
            }
        }

        return $key;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;

        if ($remainder !== 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        if ($decoded === false) {
            throw new \JsonException('Invalid base64.');
        }

        return $decoded;
    }
}
