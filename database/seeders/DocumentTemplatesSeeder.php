<?php

namespace Database\Seeders;

use App\Support\Documents\IssuedDocumentService;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Seeder;

class DocumentTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        if (CurrentSchool::id() === null) {
            return;
        }

        app(IssuedDocumentService::class)->ensureDefaultTemplates();
    }
}
