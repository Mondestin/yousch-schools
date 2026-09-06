<?php

namespace App\Http\Controllers;

use App\Support\Documents\DocumentAuthenticity;
use Inertia\Inertia;
use Inertia\Response;

class DocumentVerifyController extends Controller
{
    public function show(string $token): Response
    {
        $result = DocumentAuthenticity::verify($token);

        return Inertia::render('documents/verify', [
            'result' => [
                'valid' => $result['valid'],
                'reason' => $result['reason'] ?? null,
                'kindLabel' => $result['kindLabel'] ?? null,
                'issuedOn' => $result['issuedOn'] ?? null,
                'school' => $result['school'] ?? null,
                'student' => $result['student'] ?? null,
                'term' => $result['term'] ?? null,
                'academicYear' => $result['academicYear'] ?? null,
                'payment' => $result['payment'] ?? null,
            ],
        ]);
    }
}
