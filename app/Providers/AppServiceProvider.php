<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();
        $this->configureMailNotifications();
        $this->configureApiDocsAccess();
    }

    /**
     * OpenAPI UI/JSON (`/docs/api`, `/docs/api.json`) — local or when SCRAMBLE_DOCS_ENABLED=true.
     */
    protected function configureApiDocsAccess(): void
    {
        Gate::define('viewApiDocs', function (?object $user = null): bool {
            if (app()->environment(['local', 'testing'])) {
                return true;
            }

            return (bool) config('scramble.docs_enabled', false);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api-login', function (Request $request) {
            $email = Str::lower((string) $request->input('email', ''));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('api-login-verify', function (Request $request) {
            $token = (string) $request->input('challengeToken', '');

            return Limit::perMinute(10)->by(hash('sha256', $token).'|'.$request->ip());
        });

        RateLimiter::for('api-login-resend', function (Request $request) {
            $token = (string) $request->input('challengeToken', '');

            return Limit::perMinute(3)->by('resend:'.hash('sha256', $token).'|'.$request->ip());
        });

        RateLimiter::for('login-code', function (Request $request) {
            $token = (string) $request->session()->get('login.challenge_token', '');

            return Limit::perMinute(10)->by('web-code:'.hash('sha256', $token).'|'.$request->ip());
        });

        RateLimiter::for('login-code-resend', function (Request $request) {
            $token = (string) $request->session()->get('login.challenge_token', '');

            return Limit::perMinute(3)->by('web-resend:'.hash('sha256', $token).'|'.$request->ip());
        });

        RateLimiter::for('api-password-forgot', function (Request $request) {
            $email = Str::lower((string) $request->input('email', ''));

            return Limit::perMinute(5)->by('pw-forgot:'.$email.'|'.$request->ip());
        });

        RateLimiter::for('api-password-reset', function (Request $request) {
            $email = Str::lower((string) $request->input('email', ''));

            return Limit::perMinute(10)->by('pw-reset:'.$email.'|'.$request->ip());
        });
    }

    protected function configureMailNotifications(): void
    {
        ResetPassword::toMailUsing(function (object $notifiable, string $token): MailMessage {
            $email = $notifiable->getEmailForPasswordReset();
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $email,
            ], false));

            return (new MailMessage)
                ->subject('Réinitialisation de votre mot de passe YouSch')
                ->markdown('mail.reset-password', [
                    'url' => $url,
                    'token' => $token,
                    'email' => $email,
                    'count' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
                ]);
        });

        VerifyEmail::toMailUsing(function (object $notifiable, string $url): MailMessage {
            return (new MailMessage)
                ->subject('Confirmez votre adresse e-mail YouSch')
                ->markdown('mail.verify-email', [
                    'url' => $url,
                ]);
        });
    }
}
