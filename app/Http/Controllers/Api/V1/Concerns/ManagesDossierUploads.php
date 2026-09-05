<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\DossierFile;
use App\Support\Api\ResourceId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

        $this->deleteStoredPublicUrl($currentUrl);
        $path = $request->file('photo')->store($directory, 'public');

        return Storage::disk('public')->url($path);
    }

    /**
     * @param  list<UploadedFile>|null  $files
     */
    protected function storeDossierFiles(Model $fileable, ?array $files, string $directory): void
    {
        if ($files === null) {
            return;
        }

        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $path = $file->store($directory, 'public');

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
        if (! method_exists($from, 'dossierFiles') && ! method_exists($from, 'files')) {
            return;
        }

        $source = method_exists($from, 'dossierFiles')
            ? $from->dossierFiles()->get()
            : $from->files()->get();

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
