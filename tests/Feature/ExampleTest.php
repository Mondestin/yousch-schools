<?php

test('returns a successful response', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
});

test('home page is branded yousch', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('welcome')->where('name', 'Yousch'));
});

test('landing maintenance page keeps login available', function () {
    config(['app.landing_maintenance' => true]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome-maintenance')
            ->where('name', 'Yousch'));

    $this->get(route('login'))->assertOk();
});
