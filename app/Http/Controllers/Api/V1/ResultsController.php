<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\EnsuresStaffAbility;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\School\BulletinCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResultsController extends Controller
{
    use EnsuresStaffAbility;

    public function __construct(private BulletinCalculator $calculator) {}

    public function bulletin(Request $request, string $student): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'reports')) {
            return $denied;
        }

        $validated = $request->validate([
            'termId' => ['required', 'string', 'exists:terms,id'],
        ], [
            'termId.required' => 'Le trimestre est obligatoire.',
        ]);

        $fiche = $this->calculator->fiche($student, $validated['termId']);

        if ($fiche === null) {
            return response()->json(['message' => 'Bulletin introuvable pour cet élève et ce trimestre.'], 404);
        }

        return response()->json(['data' => $fiche]);
    }

    public function classResults(Request $request, string $classroom): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($denied = $this->denyUnlessCan($user, 'results')) {
            return $denied;
        }

        $validated = $request->validate([
            'termId' => ['required', 'string', 'exists:terms,id'],
        ], [
            'termId.required' => 'Le trimestre est obligatoire.',
        ]);

        $results = $this->calculator->classResults($classroom, $validated['termId']);

        if ($results === null) {
            return response()->json(['message' => 'Résultats introuvables pour cette classe.'], 404);
        }

        return response()->json(['data' => $results]);
    }
}
