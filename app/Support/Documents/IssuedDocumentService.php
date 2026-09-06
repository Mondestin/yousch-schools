<?php

namespace App\Support\Documents;

use App\Enums\DocumentKind;
use App\Enums\IssuedDocumentStatus;
use App\Models\DocumentTemplate;
use App\Models\Enrollment;
use App\Models\IssuedDocument;
use App\Models\User;
use App\Support\Api\ResourceId;
use App\Support\School\SchoolDocumentBuilder;
use App\Support\Storage\SchoolStorage;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class IssuedDocumentService
{
    public function __construct(private SchoolDocumentBuilder $documents) {}

    /**
     * Ensure default Congo templates exist for the current school.
     */
    public function ensureDefaultTemplates(): void
    {
        $schoolId = CurrentSchool::id();

        if ($schoolId === null) {
            return;
        }

        foreach ($this->defaultTemplates() as $default) {
            $template = DocumentTemplate::query()
                ->where('kind', $default['kind']->value)
                ->where('code', $default['code'])
                ->first();

            if ($template === null) {
                DocumentTemplate::query()->create([
                    'id' => ResourceId::make('dt'),
                    'school_id' => $schoolId,
                    'kind' => $default['kind'],
                    'code' => $default['code'],
                    'title' => $default['title'],
                    'body' => $default['body'],
                    'is_active' => true,
                    'is_system' => true,
                ]);

                continue;
            }

            if ($template->body === null || trim($template->body) === '') {
                $template->forceFill(['body' => $default['body']])->save();
            }
        }
    }

    public function issue(
        string $studentId,
        DocumentKind $kind,
        ?string $academicYearId = null,
        ?User $issuer = null,
    ): IssuedDocument {
        if (! $kind->isIssuable()) {
            throw new RuntimeException('Ce type de document ne peut pas être émis depuis le registre.');
        }

        $this->ensureDefaultTemplates();

        $payload = $this->documents->forStudent($studentId, $kind->value, $academicYearId);

        if ($payload === null) {
            throw new RuntimeException('Document introuvable pour cet élève.');
        }

        $template = DocumentTemplate::query()
            ->where('kind', $kind->value)
            ->where('is_active', true)
            ->orderByDesc('is_system')
            ->first();

        if ($template !== null) {
            $payload['title'] = $template->title;
        }

        $enrollment = is_array($payload['enrollment'] ?? null) ? $payload['enrollment'] : null;
        $year = is_array($payload['year'] ?? null) ? $payload['year'] : null;
        $issuedOn = now()->toDateString();

        return DB::transaction(function () use (
            $studentId,
            $kind,
            $payload,
            $template,
            $enrollment,
            $year,
            $issuedOn,
            $issuer,
            $academicYearId,
        ): IssuedDocument {
            $number = $this->nextNumber($kind);

            $document = IssuedDocument::query()->create([
                'id' => ResourceId::make('idoc'),
                'document_template_id' => $template?->id,
                'student_id' => $studentId,
                'enrollment_id' => is_string($enrollment['id'] ?? null) ? $enrollment['id'] : null,
                'academic_year_id' => is_string($year['id'] ?? null) ? $year['id'] : $academicYearId,
                'kind' => $kind,
                'number' => $number,
                'title' => $template?->title ?? $kind->label(),
                'status' => IssuedDocumentStatus::Issued,
                'issued_on' => $issuedOn,
                'issued_by' => $issuer?->id,
                'payload' => [
                    ...$payload,
                    'number' => $number,
                    'issuedOnIso' => $issuedOn,
                    'templateBody' => $template?->body,
                ],
            ]);

            $fileUrl = $this->storeHtmlSnapshot($document, $template);

            $document->forceFill([
                'file_url' => $fileUrl,
                'file_mime' => 'text/html',
            ])->save();

            return $document->fresh(['student', 'academicYear']) ?? $document;
        });
    }

    /**
     * Issue the same document kind for every enrollment in a classroom / year.
     *
     * @return array{
     *     created: list<array<string, mixed>>,
     *     failed: list<array{studentId: string, message: string}>,
     *     createdCount: int,
     *     failedCount: int
     * }
     */
    public function bulkIssue(
        string $classroomId,
        DocumentKind $kind,
        ?string $academicYearId = null,
        ?User $issuer = null,
    ): array {
        $query = Enrollment::query()->where('classroom_id', $classroomId);

        if ($academicYearId !== null) {
            $query->where('academic_year_id', $academicYearId);
        }

        $studentIds = $query->orderBy('student_id')->pluck('student_id')->unique()->values();

        $created = [];
        $failed = [];

        foreach ($studentIds as $studentId) {
            try {
                $document = $this->issue((string) $studentId, $kind, $academicYearId, $issuer);
                $created[] = [
                    ...$document->toApiArray(),
                    'verifyUrl' => DocumentAuthenticity::url([
                        'type' => $document->kind,
                        'studentId' => $document->student_id,
                        'refId' => $document->id,
                        'academicYearId' => $document->academic_year_id,
                        'issuedOn' => $document->issued_on->toDateString(),
                    ]),
                ];
            } catch (RuntimeException $exception) {
                $failed[] = [
                    'studentId' => (string) $studentId,
                    'message' => $exception->getMessage(),
                ];
            }
        }

        return [
            'created' => $created,
            'failed' => $failed,
            'createdCount' => count($created),
            'failedCount' => count($failed),
        ];
    }

    public function revoke(IssuedDocument $document, User $actor, ?string $reason = null): IssuedDocument
    {
        if ($document->isRevoked()) {
            return $document;
        }

        $document->forceFill([
            'status' => IssuedDocumentStatus::Revoked,
            'revoked_at' => now(),
            'revoked_by' => $actor->id,
            'revoke_reason' => $reason !== null && trim($reason) !== '' ? trim($reason) : null,
        ])->save();

        return $document->fresh(['student', 'academicYear']) ?? $document;
    }

    public function updateTemplate(DocumentTemplate $template, string $title, ?string $body): DocumentTemplate
    {
        $template->forceFill([
            'title' => trim($title),
            'body' => $body !== null && trim($body) !== '' ? trim($body) : null,
        ])->save();

        return $template->fresh() ?? $template;
    }

    /**
     * @return list<array{kind: DocumentKind, code: string, title: string, body: string}>
     */
    public function defaultTemplates(): array
    {
        $intro = 'Je soussigné(e), {{directorName}}, chef d’établissement du {{schoolName}}';
        $identity = 'l’élève {{name}}, {{genderLabel}}, né(e) le {{bornOnLabel}}, matricule {{matricule}}';

        return [
            [
                'kind' => DocumentKind::Attestation,
                'code' => 'attestation_scolarite',
                'title' => DocumentKind::Attestation->label(),
                'body' => "{$intro}, atteste que {$identity}, est régulièrement inscrit(e) en classe de {{classroomName}}{{trackSuffix}} pour l’année scolaire {{yearLabel}}.\n\nLa présente attestation est délivrée pour servir et valoir ce que de droit.",
            ],
            [
                'kind' => DocumentKind::Certificat,
                'code' => 'certificat_frequentation',
                'title' => DocumentKind::Certificat->label(),
                'body' => "{$intro}, certifie que {$identity}, fréquente régulièrement cet établissement en classe de {{classroomName}}{{trackSuffix}} pour l’année scolaire {{yearLabel}}.\n\nLe présent certificat est délivré pour servir et valoir ce que de droit.",
            ],
            [
                'kind' => DocumentKind::AttestationReussite,
                'code' => 'attestation_reussite',
                'title' => DocumentKind::AttestationReussite->label(),
                'body' => "{$intro}, atteste que {$identity}, a satisfait aux exigences scolaires de la classe de {{classroomName}}{{trackSuffix}} pour l’année scolaire {{yearLabel}} et est déclaré(e) admis(e) au passage.\n\nLa présente attestation est délivrée pour servir et valoir ce que de droit.",
            ],
            [
                'kind' => DocumentKind::AttestationRadiation,
                'code' => 'attestation_radiation',
                'title' => DocumentKind::AttestationRadiation->label(),
                'body' => "{$intro}, atteste que {$identity}, a été radié(e) des effectifs de cet établissement. Dernière classe fréquentée : {{classroomName}}{{trackSuffix}} (année scolaire {{yearLabel}}).\n\nLa présente attestation est délivrée pour servir et valoir ce que de droit.",
            ],
            [
                'kind' => DocumentKind::AttestationTransfert,
                'code' => 'attestation_transfert',
                'title' => DocumentKind::AttestationTransfert->label(),
                'body' => "{$intro}, atteste que {$identity}, était régulièrement inscrit(e) en classe de {{classroomName}}{{trackSuffix}} pour l’année scolaire {{yearLabel}} et quitte l’établissement pour poursuivre sa scolarité ailleurs.\n\nLa présente attestation de transfert est délivrée pour servir et valoir ce que de droit.",
            ],
            [
                'kind' => DocumentKind::AttestationBourse,
                'code' => 'attestation_bourse',
                'title' => DocumentKind::AttestationBourse->label(),
                'body' => "{$intro}, atteste que {$identity}, est régulièrement inscrit(e) en classe de {{classroomName}}{{trackSuffix}} pour l’année scolaire {{yearLabel}}.\n\nLa présente attestation est délivrée pour l’appui d’une demande de bourse ou de transport scolaire.",
            ],
            [
                'kind' => DocumentKind::CertificatConduite,
                'code' => 'certificat_conduite',
                'title' => DocumentKind::CertificatConduite->label(),
                'body' => "{$intro}, certifie que {$identity}, élève de la classe de {{classroomName}}{{trackSuffix}} pour l’année scolaire {{yearLabel}}, a fait preuve d’une bonne conduite au sein de l’établissement.\n\nLe présent certificat est délivré pour servir et valoir ce que de droit.",
            ],
        ];
    }

    private function nextNumber(DocumentKind $kind): string
    {
        $prefix = $kind->numberPrefix();
        $year = now()->format('Y');
        $pattern = $prefix.'-'.$year.'-';

        $latest = IssuedDocument::query()
            ->where('number', 'like', $pattern.'%')
            ->lockForUpdate()
            ->orderByDesc('number')
            ->value('number');

        $sequence = 1;

        if (is_string($latest) && preg_match('/-(\d+)$/', $latest, $matches) === 1) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return $pattern.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    private function storeHtmlSnapshot(IssuedDocument $document, ?DocumentTemplate $template = null): string
    {
        $payload = $document->payload;
        $profile = is_array($payload['profile'] ?? null) ? $payload['profile'] : [];
        $vars = $this->placeholderValues($document, $payload, $profile);
        $title = $vars['title'];
        $bodySource = $template?->body
            ?? (is_string($payload['templateBody'] ?? null) ? $payload['templateBody'] : null)
            ?? $this->defaultBodyFor($document->kind);
        $bodyHtml = $this->renderBody($bodySource, $vars);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{$this->e($title)} · {$this->e($document->number)}</title>
<style>
body{font-family:Georgia,serif;color:#111;max-width:210mm;margin:24px auto;padding:24px;line-height:1.6}
header,h1{text-align:center}
h1{text-transform:uppercase;font-size:22px;margin:32px 0}
.meta{color:#555;font-size:13px}
.number{margin-top:8px;font-size:12px;letter-spacing:.04em}
.sign{text-align:right;margin-top:48px}
.body p{margin:0 0 1em;font-size:15px}
</style>
</head>
<body>
<header>
<p><strong>{$this->e($vars['schoolName'])}</strong></p>
<p class="meta">{$this->e($vars['address'])}</p>
<p class="meta">{$this->e($vars['city'])} · {$this->e($vars['phone'])}</p>
<p class="number">N° {$this->e($document->number)}</p>
</header>
<h1>{$this->e($title)}</h1>
<div class="body">{$bodyHtml}</div>
<p class="sign">Fait à {$this->e($vars['city'])}, le {$this->e($vars['issuedOn'])}<br><br>Le chef d’établissement<br>{$this->e($vars['directorName'])}</p>
</body>
</html>
HTML;

        return SchoolStorage::put($html, 'documents/issued', $document->id.'.html');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $profile
     * @return array<string, string>
     */
    private function placeholderValues(IssuedDocument $document, array $payload, array $profile): array
    {
        $trackCode = is_string($payload['trackCode'] ?? null) ? $payload['trackCode'] : '';
        $trackSuffix = $trackCode !== '' ? ' (série '.$trackCode.')' : '';
        $gender = (string) ($payload['genderLabel'] ?? '');

        return [
            'title' => (string) ($payload['title'] ?? $document->title),
            'name' => (string) ($payload['name'] ?? ''),
            'classroomName' => (string) ($payload['classroomName'] ?? '-'),
            'yearLabel' => (string) ($payload['yearLabel'] ?? '-'),
            'trackCode' => $trackCode,
            'trackSuffix' => $trackSuffix,
            'bornOnLabel' => (string) ($payload['bornOnLabel'] ?? '-'),
            'genderLabel' => mb_strtolower($gender),
            'matricule' => is_array($payload['student'] ?? null)
                ? (string) ($payload['student']['matricule'] ?? '')
                : '',
            'schoolName' => (string) ($profile['name'] ?? CurrentSchool::require()->name),
            'directorName' => (string) ($profile['directorName'] ?? ''),
            'city' => (string) ($profile['city'] ?? ''),
            'address' => (string) ($profile['address'] ?? ''),
            'phone' => (string) ($profile['phone'] ?? ''),
            'issuedOn' => (string) ($payload['issuedOn'] ?? $document->issued_on->format('d/m/Y')),
            'number' => $document->number,
        ];
    }

    /**
     * @param  array<string, string>  $vars
     */
    private function renderBody(string $body, array $vars): string
    {
        $replaced = $body;

        foreach ($vars as $key => $value) {
            $replaced = str_replace('{{'.$key.'}}', $value, $replaced);
        }

        $escaped = $this->e($replaced);

        $paragraphs = preg_split("/\n{2,}/", $escaped) ?: [$escaped];

        return collect($paragraphs)
            ->map(static fn (string $paragraph): string => '<p>'.nl2br(trim($paragraph), false).'</p>')
            ->implode('');
    }

    private function defaultBodyFor(DocumentKind $kind): string
    {
        foreach ($this->defaultTemplates() as $default) {
            if ($default['kind'] === $kind) {
                return $default['body'];
            }
        }

        return '{{name}}';
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
