<?php

beforeEach(function (): void {
    ini_set('memory_limit', '512M');
});

test('openapi docs ui and json are available locally', function () {
    $this->get('/docs/api')
        ->assertOk();

    $this->getJson('/docs/api.json')
        ->assertOk()
        ->assertJsonPath('openapi', '3.1.0')
        ->assertJsonPath('info.title', 'YouSch API');
});

test('openapi document includes login and bearer security', function () {
    $document = $this->getJson('/docs/api.json')
        ->assertOk()
        ->json();

    expect($document['paths'] ?? [])->toHaveKey('/login')
        ->and($document['paths']['/login'])->toHaveKey('post')
        ->and($document['paths'] ?? [])->toHaveKey('/login/verify')
        ->and($document['paths'] ?? [])->toHaveKey('/login/resend')
        ->and($document['paths'] ?? [])->toHaveKey('/portal/me')
        ->and($document['paths'] ?? [])->toHaveKey('/portal/students/{student}/profile')
        ->and($document['paths'] ?? [])->toHaveKey('/portal/students/{student}/planning')
        ->and($document['paths'] ?? [])->toHaveKey('/portal/students/{student}/notes')
        ->and($document['paths'] ?? [])->toHaveKey('/portal/students/{student}/presences');

    $scheme = $document['components']['securitySchemes']['http'] ?? null;

    expect($scheme)->toBeArray()
        ->and($scheme['type'] ?? null)->toBe('http')
        ->and($scheme['scheme'] ?? null)->toBe('bearer');
});

test('openapi specification can be exported for mobile clients', function () {
    $this->artisan('scramble:export')
        ->assertSuccessful();

    $path = base_path(config('scramble.export_path'));

    expect(file_exists($path))->toBeTrue();

    $document = json_decode((string) file_get_contents($path), true);

    expect($document['openapi'] ?? null)->toBe('3.1.0')
        ->and($document['paths'] ?? [])->toHaveKey('/login');
});
