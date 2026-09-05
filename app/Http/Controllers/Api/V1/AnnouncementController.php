<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AnnouncementAudience;
use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\User;
use App\Support\Api\ResourceId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    use EnsuresStaffAbility;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'announcements')) {
            return $denied;
        }

        $query = Announcement::query()->orderByDesc('published_on');

        if ($request->filled('audience')) {
            $query->where('audience', $request->string('audience'));
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray()->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'announcements')) {
            return $denied;
        }

        $validated = $this->validatedAnnouncement($request);

        $announcement = Announcement::query()->create([
            'id' => ResourceId::make('an'),
            'title' => $validated['title'],
            'body' => $validated['body'],
            'audience' => $validated['audience'],
            'published_on' => $validated['publishedOn'],
            'expires_on' => $validated['expiresOn'] ?? null,
        ]);

        return response()->json(['data' => $announcement->toApiArray()], 201);
    }

    public function update(Request $request, string $announcement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'announcements')) {
            return $denied;
        }

        $model = Announcement::query()->findOrFail($announcement);
        $validated = $this->validatedAnnouncement($request);

        $model->update([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'audience' => $validated['audience'],
            'published_on' => $validated['publishedOn'],
            'expires_on' => $validated['expiresOn'] ?? null,
        ]);

        return response()->json(['data' => $model->fresh()->toApiArray()]);
    }

    public function destroy(Request $request, string $announcement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'announcements')) {
            return $denied;
        }

        Announcement::query()->findOrFail($announcement)->delete();

        return response()->json(['message' => 'Annonce supprimée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAnnouncement(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string'],
            'audience' => ['required', 'string', Rule::enum(AnnouncementAudience::class)],
            'publishedOn' => ['required', 'date'],
            'expiresOn' => ['nullable', 'date', 'after_or_equal:publishedOn'],
        ], [
            'title.required' => 'Le titre est obligatoire.',
            'body.required' => 'Le contenu est obligatoire.',
            'audience.required' => 'Le public est obligatoire.',
            'publishedOn.required' => 'La date de publication est obligatoire.',
            'expiresOn.after_or_equal' => 'La date d’expiration doit être après la publication.',
        ]);
    }
}
