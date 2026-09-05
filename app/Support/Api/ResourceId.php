<?php

namespace App\Support\Api;

use Illuminate\Support\Str;

final class ResourceId
{
    public static function make(string $prefix): string
    {
        return $prefix.'-'.Str::lower((string) Str::ulid());
    }
}
