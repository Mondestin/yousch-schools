<?php

use Laravel\Fortify\Features;

test('public registration is disabled', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();
});

test('registration screen can be rendered', function () {
    $this->skipUnlessFortifyHas(Features::registration());

    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $this->skipUnlessFortifyHas(Features::registration());

    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});
