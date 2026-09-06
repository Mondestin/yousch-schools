<?php

use App\Models\User;

test('api login is rate limited after five attempts', function () {
    $school = defaultSchool();
    $email = 'locked-'.uniqid('', true).'@example.com';
    $payload = [
        'domain' => $school->domain,
        'email' => $email,
        'password' => 'wrong-password',
    ];

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->postJson('/api/v1/login', $payload)->assertUnprocessable();
    }

    $this->postJson('/api/v1/login', $payload)
        ->assertStatus(429)
        ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'Trop de tentatives'));
});

test('api login validation messages are in french', function () {
    $this->postJson('/api/v1/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['domain', 'email', 'password'])
        ->assertJsonPath('errors.domain.0', 'Le domaine de l’établissement est obligatoire.')
        ->assertJsonPath('errors.email.0', 'L’adresse e-mail est obligatoire.')
        ->assertJsonPath('errors.password.0', 'Le mot de passe est obligatoire.');
});

test('bearer token abilities mirror staff role', function () {
    $school = defaultSchool();
    $user = User::factory()->secretaire()->create([
        'password' => 'password',
    ]);

    $token = $this->postJson('/api/v1/login', [
        'domain' => $school->domain,
        'email' => $user->email,
        'password' => 'password',
        'deviceName' => 'test-phone',
    ])->assertOk()
        ->json('token');

    $this->withToken($token)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.role', 'secretaire');

    $this->withToken($token)
        ->putJson('/api/v1/grades', [
            'assessmentId' => 'as-missing',
            'grades' => [['enrollmentId' => 'en-1', 'score' => 10]],
        ])
        ->assertForbidden();
});
