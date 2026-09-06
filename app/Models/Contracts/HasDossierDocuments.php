<?php

namespace App\Models\Contracts;

use App\Models\DossierFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @template TModel of Model
 *
 * @phpstan-require-extends Model
 */
interface HasDossierDocuments
{
    /**
     * @return MorphMany<DossierFile, TModel>
     */
    public function dossierFiles(): MorphMany;
}
