<?php

use App\Models\StaffAttendanceMark;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;

test('directeur can bulk upsert staff attendance', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->directeur()->create());

    $teacher = Teacher::query()->where('status', 'actif')->firstOrFail();

    $this->putJson('/api/v1/staff-attendance', [
        'date' => '2026-09-10',
        'marks' => [
            [
                'teacherId' => $teacher->id,
                'status' => 'present',
                'note' => null,
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.0.teacherId', $teacher->id)
        ->assertJsonPath('data.0.status', 'present')
        ->assertJsonPath('data.0.date', '2026-09-10');

    $mark = StaffAttendanceMark::query()
        ->where('teacher_id', $teacher->id)
        ->whereDate('date', '2026-09-10')
        ->first();

    expect($mark)->not->toBeNull()
        ->and($mark->status->value)->toBe('present');

    $this->putJson('/api/v1/staff-attendance', [
        'date' => '2026-09-10',
        'marks' => [
            [
                'teacherId' => $teacher->id,
                'status' => 'excuse',
                'note' => 'Formation pédagogique',
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.0.status', 'excuse')
        ->assertJsonPath('data.0.note', 'Formation pédagogique');

    expect(StaffAttendanceMark::query()->where('teacher_id', $teacher->id)->whereDate('date', '2026-09-10')->count())
        ->toBe(1);
});

test('enseignant cannot upsert staff attendance', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->enseignant()->create());

    $teacher = Teacher::query()->firstOrFail();

    $this->putJson('/api/v1/staff-attendance', [
        'date' => '2026-09-10',
        'marks' => [
            [
                'teacherId' => $teacher->id,
                'status' => 'present',
            ],
        ],
    ])->assertForbidden();
});
