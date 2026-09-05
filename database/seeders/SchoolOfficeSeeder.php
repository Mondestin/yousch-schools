<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\InventoryItem;
use App\Models\Sanction;
use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SchoolOfficeSeeder extends Seeder
{
    public function run(): void
    {
        /** @var array<string, mixed> $dataset */
        $dataset = json_decode(
            File::get(resource_path('js/mocks/school.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        foreach ($dataset['inventory'] as $item) {
            InventoryItem::query()->updateOrCreate(
                ['id' => $item['id']],
                [
                    'reference' => $item['reference'],
                    'name' => $item['name'],
                    'category' => $item['category'],
                    'quantity' => $item['quantity'],
                    'min_quantity' => $item['minQuantity'],
                    'unit_cost' => $item['unitCost'],
                    'condition' => $item['condition'],
                    'status' => $item['status'],
                    'location' => $item['location'],
                    'assignee' => $item['assignee'] ?? null,
                    'supplier' => $item['supplier'] ?? null,
                    'acquired_on' => $item['acquiredOn'] ?? null,
                    'warranty_until' => $item['warrantyUntil'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ],
            );
        }

        foreach ($dataset['announcements'] as $announcement) {
            Announcement::query()->updateOrCreate(
                ['id' => $announcement['id']],
                [
                    'title' => $announcement['title'],
                    'body' => $announcement['body'],
                    'audience' => $announcement['audience'],
                    'published_on' => $announcement['publishedOn'],
                    'expires_on' => $announcement['expiresOn'] ?? null,
                ],
            );
        }

        if (! Student::query()->exists()) {
            return;
        }

        foreach ($dataset['sanctions'] as $sanction) {
            Sanction::query()->updateOrCreate(
                ['id' => $sanction['id']],
                [
                    'student_id' => $sanction['studentId'],
                    'date' => $sanction['date'],
                    'type' => $sanction['type'],
                    'reason' => $sanction['reason'],
                ],
            );
        }
    }
}
