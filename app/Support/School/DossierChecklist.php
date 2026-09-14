<?php

namespace App\Support\School;

/**
 * Soft checklist of pieces expected in a pupil dossier.
 * Matching is by normalized filename keywords (and photoUrl for identity photo).
 */
final class DossierChecklist
{
    /**
     * @return list<array{code: string, label: string, keywords: list<string>}>
     */
    public static function slots(): array
    {
        return [
            [
                'code' => 'extrait_naissance',
                'label' => 'Extrait de naissance',
                'keywords' => ['extrait', 'naissance', 'acte'],
            ],
            [
                'code' => 'photo_identite',
                'label' => 'Photo d’identité',
                'keywords' => ['photo', 'identite', 'identité', 'portrait'],
            ],
            [
                'code' => 'carnet_vaccination',
                'label' => 'Carnet de vaccination',
                'keywords' => ['vaccin', 'carnet'],
            ],
            [
                'code' => 'certificat_medical',
                'label' => 'Certificat médical',
                'keywords' => ['medical', 'médical', 'certificat'],
            ],
        ];
    }

    /**
     * @param  list<array{name?: string, mime?: string}>  $files
     * @return array{
     *     complete: bool,
     *     present: list<string>,
     *     missing: list<string>,
     *     missingLabels: list<string>
     * }
     */
    public static function evaluate(?string $photoUrl, array $files): array
    {
        $present = [];

        if (is_string($photoUrl) && trim($photoUrl) !== '') {
            $present[] = 'photo_identite';
        }

        $haystacks = array_map(
            static function (array $file): string {
                $name = is_string($file['name'] ?? null) ? $file['name'] : '';

                return self::normalize($name);
            },
            $files,
        );

        foreach (self::slots() as $slot) {
            if (in_array($slot['code'], $present, true)) {
                continue;
            }

            foreach ($haystacks as $haystack) {
                foreach ($slot['keywords'] as $keyword) {
                    if ($haystack !== '' && str_contains($haystack, self::normalize($keyword))) {
                        $present[] = $slot['code'];

                        continue 3;
                    }
                }
            }
        }

        $present = array_values(array_unique($present));
        $missing = [];
        $missingLabels = [];

        foreach (self::slots() as $slot) {
            if (! in_array($slot['code'], $present, true)) {
                $missing[] = $slot['code'];
                $missingLabels[] = $slot['label'];
            }
        }

        return [
            'complete' => $missing === [],
            'present' => $present,
            'missing' => $missing,
            'missingLabels' => $missingLabels,
        ];
    }

    private static function normalize(string $value): string
    {
        $value = mb_strtolower($value);
        $value = str_replace(
            ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ï', 'ç'],
            ['e', 'e', 'e', 'e', 'a', 'a', 'u', 'u', 'o', 'i', 'i', 'c'],
            $value,
        );

        return preg_replace('/[^a-z0-9]+/u', '', $value) ?? $value;
    }
}
