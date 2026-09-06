<?php

test('unknown web page renders branded inertia error', function () {
    $this->get('/cette-page-nexiste-pas')
        ->assertNotFound()
        ->assertInertia(fn ($page) => $page
            ->component('errors/show')
            ->where('status', 404));
});
