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
