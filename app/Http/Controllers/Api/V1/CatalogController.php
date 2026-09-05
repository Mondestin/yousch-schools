<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\School\SchoolDatasetAssembler;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function __construct(private SchoolDatasetAssembler $assembler) {}

    /**
     * Full SchoolDataset for web + mobile (Eloquent when seeded).
     */
    public function show(): JsonResponse
    {
        return response()->json($this->assembler->assemble());
    }
}
