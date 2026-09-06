<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Support\Storage\SchoolStorage;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $user->fill($request->safe()->only(['name', 'email']));

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->boolean('removeAvatar')) {
            SchoolStorage::deleteUrl($user->avatar_url);
            $user->avatar_url = null;
        }

        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar');

            if ($avatar instanceof UploadedFile) {
                SchoolStorage::deleteUrl($user->avatar_url);
                $user->avatar_url = SchoolStorage::store($avatar, 'staff/avatars');
            }
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profil mis à jour.')]);

        return to_route('profile.edit');
    }
}
