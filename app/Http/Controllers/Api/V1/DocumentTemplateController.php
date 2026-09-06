<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\User;
use App\Support\Documents\IssuedDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentTemplateController extends Controller
{
    use EnsuresStaffAbility;

    public function __construct(private IssuedDocumentService $issuedDocuments) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $this->issuedDocuments->ensureDefaultTemplates();

        $templates = DocumentTemplate::query()
            ->orderBy('kind')
            ->orderBy('title')
            ->get()
            ->map->toApiArray()
            ->values()
            ->all();

        return response()->json(['data' => $templates]);
    }

    public function update(Request $request, string $documentTemplate): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'documents')) {
            return $denied;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'body' => ['nullable', 'string', 'max:10000'],
            'isActive' => ['sometimes', 'boolean'],
        ], [
            'title.required' => 'Le titre est obligatoire.',
        ]);

        $template = DocumentTemplate::query()->findOrFail($documentTemplate);

        $updated = $this->issuedDocuments->updateTemplate(
            $template,
            $validated['title'],
            $validated['body'] ?? null,
        );

        if (array_key_exists('isActive', $validated)) {
            $updated->forceFill(['is_active' => (bool) $validated['isActive']])->save();
            $updated = $updated->fresh() ?? $updated;
        }

        return response()->json(['data' => $updated->toApiArray()]);
    }
}
