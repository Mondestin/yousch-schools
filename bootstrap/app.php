<?php

use App\Http\Middleware\AuthenticateStaffApi;
use App\Http\Middleware\EnsureCurrentAcademicYear;
use App\Http\Middleware\EnsureUserNotBlocked;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetCurrentSchool;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'auth.staff' => AuthenticateStaffApi::class,
            'school' => SetCurrentSchool::class,
        ]);

        // Same-origin web clients call /api/v1 with session + CSRF cookies.
        $middleware->api(prepend: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ValidateCsrfToken::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            SetCurrentSchool::class,
            EnsureUserNotBlocked::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(append: [
            EnsureUserNotBlocked::class,
            SetCurrentSchool::class,
            EnsureCurrentAcademicYear::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (TooManyRequestsHttpException $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            $retry = $exception->getHeaders()['Retry-After'] ?? null;

            return response()->json([
                'message' => is_numeric($retry)
                    ? "Trop de tentatives. Réessayez dans {$retry} secondes."
                    : 'Trop de tentatives. Réessayez plus tard.',
            ], 429);
        });

        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return $response;
            }

            $status = $response->getStatusCode();

            if (! in_array($status, [403, 404, 419, 429, 500, 503], true)) {
                return $response;
            }

            if ($status === 500 && app()->hasDebugModeEnabled()) {
                return $response;
            }

            return Inertia::render('errors/show', [
                'status' => $status,
                'auth' => [
                    'user' => $request->user(),
                ],
                'name' => config('app.name'),
            ])
                ->toResponse($request)
                ->setStatusCode($status);
        });
    })->create();
