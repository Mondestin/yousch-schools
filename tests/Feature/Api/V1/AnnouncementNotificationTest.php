<?php

use App\Models\Announcement;
use App\Models\School;
use App\Models\User;
use App\Notifications\AnnouncementPublishedNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

test('personnel announcements email school staff', function () {
    Notification::fake();

    $school = School::factory()->create();
    $admin = User::factory()->admin()->create([
        'school_id' => $school->id,
        'email' => 'admin.annonce@example.test',
    ]);
    $secretary = User::factory()->secretaire()->create([
        'school_id' => $school->id,
        'email' => 'secretaire.annonce@example.test',
    ]);
    $blocked = User::factory()->secretaire()->create([
        'school_id' => $school->id,
        'email' => 'blocked.annonce@example.test',
        'blocked_at' => now(),
    ]);
    $otherSchool = User::factory()->admin()->create([
        'school_id' => School::factory()->create()->id,
        'email' => 'other.school@example.test',
    ]);

    $this->actingAs($admin)
        ->postJson('/api/v1/announcements', [
            'title' => 'Réunion pédagogique',
            'body' => 'Présence obligatoire vendredi.',
            'audience' => 'personnel',
            'publishedOn' => now()->toDateString(),
            'expiresOn' => now()->addDays(7)->toDateString(),
        ])
        ->assertCreated()
        ->assertJsonPath('meta.staffEmailed', 2);

    Notification::assertSentTo(
        [$admin, $secretary],
        AnnouncementPublishedNotification::class,
        function (AnnouncementPublishedNotification $notification) use ($school): bool {
            return $notification->kind === 'created'
                && $notification->schoolName === ($school->name)
                && $notification->announcement->title === 'Réunion pédagogique';
        },
    );
    Notification::assertNotSentTo($blocked, AnnouncementPublishedNotification::class);
    Notification::assertNotSentTo($otherSchool, AnnouncementPublishedNotification::class);
});

test('tous announcements email school staff', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->postJson('/api/v1/announcements', [
            'title' => 'Journée portes ouvertes',
            'body' => 'Bienvenue à tous.',
            'audience' => 'tous',
            'publishedOn' => now()->toDateString(),
        ])
        ->assertCreated()
        ->assertJsonPath('meta.staffEmailed', 1);

    Notification::assertSentTo($admin, AnnouncementPublishedNotification::class);
});

test('parent and eleves announcements do not email staff', function (string $audience) {
    Notification::fake();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->postJson('/api/v1/announcements', [
            'title' => 'Message '.$audience,
            'body' => 'Contenu.',
            'audience' => $audience,
            'publishedOn' => now()->toDateString(),
        ])
        ->assertCreated()
        ->assertJsonPath('meta.staffEmailed', 0);

    Notification::assertNothingSent();
})->with(['parents', 'eleves']);

test('future published announcements do not email yet', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->postJson('/api/v1/announcements', [
            'title' => 'Annonce future',
            'body' => 'Pas encore.',
            'audience' => 'personnel',
            'publishedOn' => now()->addDays(3)->toDateString(),
        ])
        ->assertCreated()
        ->assertJsonPath('meta.staffEmailed', 0);

    Notification::assertNothingSent();
});

test('update emails staff only when content changes', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();

    $announcement = Announcement::query()->create([
        'id' => (string) Str::ulid(),
        'school_id' => $admin->school_id,
        'title' => 'Titre initial',
        'body' => 'Corps initial',
        'audience' => 'personnel',
        'published_on' => now()->toDateString(),
        'expires_on' => null,
    ]);

    $this->actingAs($admin)
        ->putJson('/api/v1/announcements/'.$announcement->id, [
            'title' => 'Titre initial',
            'body' => 'Corps initial',
            'audience' => 'personnel',
            'publishedOn' => now()->toDateString(),
            'expiresOn' => null,
        ])
        ->assertOk()
        ->assertJsonPath('meta.staffEmailed', 0);

    Notification::assertNothingSent();

    $this->actingAs($admin)
        ->putJson('/api/v1/announcements/'.$announcement->id, [
            'title' => 'Titre modifié',
            'body' => 'Corps initial',
            'audience' => 'personnel',
            'publishedOn' => now()->toDateString(),
            'expiresOn' => null,
        ])
        ->assertOk()
        ->assertJsonPath('meta.staffEmailed', 1);

    Notification::assertSentTo(
        $admin,
        AnnouncementPublishedNotification::class,
        fn (AnnouncementPublishedNotification $notification): bool => $notification->kind === 'updated',
    );
});
