<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\SchoolProfile;
use App\Models\User;
use App\Support\SchoolCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SchoolProfileController extends Controller
{
    use EnsuresStaffAbility;

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'school')) {
            return $denied;
        }

        $profile = SchoolProfile::query()->first();

        return response()->json([
            'data' => $profile?->toApiArray() ?? SchoolCatalog::fixture()['profile'],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'school')) {
            return $denied;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'promoterName' => ['required', 'string', 'max:180'],
            'directorName' => ['required', 'string', 'max:180'],
            'city' => ['required', 'string', 'max:120'],
            'country' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:40'],
            'email' => ['required', 'email', 'max:180'],
            'address' => ['required', 'string', 'max:255'],
            'motto' => ['required', 'string', 'max:255'],
            'currency' => ['required', 'string', Rule::in(['FCFA'])],
            'logo' => ['nullable', 'image', 'max:2048'],
            'stamp' => ['nullable', 'image', 'max:2048'],
            'removeLogo' => ['sometimes', 'boolean'],
            'removeStamp' => ['sometimes', 'boolean'],
        ], [
            'name.required' => 'Le nom de l’établissement est obligatoire.',
            'promoterName.required' => 'Le nom du promoteur est obligatoire.',
            'directorName.required' => 'Le nom du directeur est obligatoire.',
            'city.required' => 'La ville est obligatoire.',
            'country.required' => 'Le pays est obligatoire.',
            'phone.required' => 'Le téléphone est obligatoire.',
            'email.required' => 'L’adresse e-mail est obligatoire.',
            'email.email' => 'L’adresse e-mail n’est pas valide.',
            'address.required' => 'L’adresse est obligatoire.',
            'motto.required' => 'La devise est obligatoire.',
            'currency.in' => 'La devise doit être FCFA.',
            'logo.image' => 'Le logo doit être une image.',
            'stamp.image' => 'Le cachet doit être une image.',
        ]);

        $profile = SchoolProfile::query()->first() ?? new SchoolProfile;

        $profile->fill([
            'name' => $validated['name'],
            'promoter_name' => $validated['promoterName'],
            'director_name' => $validated['directorName'],
            'city' => $validated['city'],
            'country' => $validated['country'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'address' => $validated['address'],
            'motto' => $validated['motto'],
            'currency' => $validated['currency'],
        ]);

        if ($request->boolean('removeLogo')) {
            $this->deleteStoredUrl($profile->logo_url);
            $profile->logo_url = null;
        }

        if ($request->boolean('removeStamp')) {
            $this->deleteStoredUrl($profile->stamp_url);
            $profile->stamp_url = null;
        }

        if ($request->hasFile('logo')) {
            $this->deleteStoredUrl($profile->logo_url);
            $path = $request->file('logo')->store('school', 'public');
            $profile->logo_url = Storage::disk('public')->url($path);
        }

        if ($request->hasFile('stamp')) {
            $this->deleteStoredUrl($profile->stamp_url);
            $path = $request->file('stamp')->store('school', 'public');
            $profile->stamp_url = Storage::disk('public')->url($path);
        }

        $profile->save();

        return response()->json(['data' => $profile->toApiArray()]);
    }

    private function deleteStoredUrl(?string $url): void
    {
        if ($url === null || $url === '') {
            return;
        }

        $prefix = '/storage/';
        $position = strpos($url, $prefix);

        if ($position === false) {
            return;
        }

        $relative = substr($url, $position + strlen($prefix));
        Storage::disk('public')->delete($relative);
    }
}
