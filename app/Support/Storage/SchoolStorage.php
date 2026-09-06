<?php

namespace App\Support\Storage;

use App\Support\Tenancy\CurrentSchool;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class SchoolStorage
{
    public static function diskName(): string
    {
        return (string) config('filesystems.uploads', 'public');
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::diskName());
    }

    /**
     * Root folder for the current school: schools/{domain}
     */
    public static function schoolRoot(): string
    {
        $domain = CurrentSchool::require()->domain;

        return 'schools/'.$domain;
    }

    /**
     * Scope a relative directory under the current school root.
     */
    public static function path(string $directory = ''): string
    {
        $directory = trim(str_replace('\\', '/', $directory), '/');

        return $directory === ''
            ? self::schoolRoot()
            : self::schoolRoot().'/'.$directory;
    }

    public static function store(UploadedFile $file, string $directory): string
    {
        $path = $file->store(self::path($directory), self::diskName());

        if ($path === false) {
            throw new RuntimeException('Impossible d’enregistrer le fichier.');
        }

        return self::url($path);
    }

    public static function url(string $path): string
    {
        return self::disk()->url($path);
    }

    public static function deleteUrl(?string $url): void
    {
        if ($url === null || $url === '') {
            return;
        }

        $path = self::pathFromUrl($url);

        if ($path === null) {
            return;
        }

        self::disk()->delete($path);
    }

    public static function pathFromUrl(string $url): ?string
    {
        $disk = self::diskName();

        if ($disk === 'public') {
            $prefix = '/storage/';
            $position = strpos($url, $prefix);

            if ($position === false) {
                return null;
            }

            return substr($url, $position + strlen($prefix));
        }

        $base = rtrim((string) config("filesystems.disks.{$disk}.url"), '/');

        if ($base !== '' && str_starts_with($url, $base.'/')) {
            return ltrim(substr($url, strlen($base) + 1), '/');
        }

        $endpoint = rtrim((string) config("filesystems.disks.{$disk}.endpoint"), '/');
        $bucket = (string) config("filesystems.disks.{$disk}.bucket");
        $candidates = array_filter([
            $endpoint !== '' && $bucket !== '' ? "{$endpoint}/{$bucket}/" : null,
            $endpoint !== '' && $bucket !== '' ? 'https://'.$bucket.'.'.preg_replace('#^https?://#', '', $endpoint).'/' : null,
        ]);

        foreach ($candidates as $prefix) {
            if (str_starts_with($url, $prefix)) {
                return ltrim(substr($url, strlen($prefix)), '/');
            }
        }

        return null;
    }
}
