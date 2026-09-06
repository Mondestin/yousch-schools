<?php

namespace App\Support\Auth;

use App\Models\School;
use App\Models\User;
use App\Notifications\StaffAccountCreated;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Support\Str;

final class StaffCredentialsMailer
{
    /**
     * Rotate (or set) the password and email login details for a staff account.
     */
    public static function send(User $staff, bool $resend = false, ?string $plainPassword = null): string
    {
        $plainPassword ??= Str::password(12);

        $staff->forceFill([
            'password' => $plainPassword,
        ])->save();

        $school = CurrentSchool::get() ?? School::query()->find($staff->school_id);
        $school?->loadMissing('profile');

        $domain = $school?->domain ?? '';
        $schoolName = $school?->profile?->name ?? $school?->name ?? 'Yousch';
        $loginUrl = $domain !== ''
            ? route('login.domain', [
                'domain' => $domain,
                'email' => $staff->email,
            ], absolute: true)
            : url('/login');

        $staff->notify(new StaffAccountCreated(
            schoolName: $schoolName,
            domain: $domain,
            loginUrl: $loginUrl,
            plainPassword: $plainPassword,
            roleLabel: $staff->role->label(),
            isResend: $resend,
        ));

        return $plainPassword;
    }
}
