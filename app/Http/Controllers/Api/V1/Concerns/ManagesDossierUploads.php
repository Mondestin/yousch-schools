<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\Contracts\HasDossierDocuments;
use App\Models\Contracts\HasDossierFiles;
use App\Models\DossierFile;
use App\Support\Api\ResourceId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

trait ManagesDossierUploads
{
    protected function storePhoto(Request $request, string $directory, ?string $currentUrl = null): ?string
    {
        if ($request->boolean('removePhoto')) {
            $this->deleteStoredPublicUrl($currentUrl);

            return null;
        }

        if (! $request->hasFile('photo')) {
            return $currentUrl;
        }

        $photo = $request->file('photo');

        if (! $photo instanceof UploadedFile) {
            return $currentUrl;
        }

        $this->deleteStoredPublicUrl($currentUrl);
        $path = $photo->store($directory, 'public');

        if ($path === false) {
            throw new RuntimeException('Impossible d’enregistrer la photo.');
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * @param  UploadedFile|array<int, mixed>|null  $files
     */
    protected function storeDossierFiles(Model $fileable, UploadedFile|array|null $files, string $directory): void
    {
        if ($files === null) {
            return;
        }

        $uploads = $files instanceof UploadedFile ? [$files] : $files;

        foreach ($uploads as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $path = $file->store($directory, 'public');

            if ($path === false) {
                throw new RuntimeException('Impossible d’enregistrer le fichier.');
            }

            DossierFile::query()->create([
                'id' => ResourceId::make('df'),
                'fileable_type' => $fileable::class,
                'fileable_id' => $fileable->getKey(),
                'name' => $file->getClientOriginalName(),
                'url' => Storage::disk('public')->url($path),
                'mime' => $file->getClientMimeType() ?: 'application/octet-stream',
            ]);
        }
    }

    protected function copyDossierFiles(Model $from, Model $to): void
    {
        if ($from instanceof HasDossierFiles) {
            $source = $from->files()->get();
        } elseif ($from instanceof HasDossierDocuments) {
            $source = $from->dossierFiles()->get();
        } else {
            return;
        }

        foreach ($source as $file) {
            DossierFile::query()->create([
                'id' => ResourceId::make('df'),
                'fileable_type' => $to::class,
                'fileable_id' => $to->getKey(),
                'name' => $file->name,
                'url' => $file->url,
                'mime' => $file->mime,
            ]);
        }
    }

    protected function deleteStoredPublicUrl(?string $url): void
    {
        if ($url === null || $url === '') {
            return;
        }

        $prefix = '/storage/';
        $position = strpos($url, $prefix);

        if ($position === false) {
            return;
        }

        Storage::disk('public')->delete(substr($url, $position + strlen($prefix)));
    }
}
