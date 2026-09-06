<?php

namespace App\Models\Concerns;

use App\Models\School;
use App\Models\Scopes\SchoolScope;
use App\Models\User;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @mixin Model
 *
 * @property string $school_id
 */
trait BelongsToSchool
{
    public static function bootBelongsToSchool(): void
    {
        // Users must be loadable by the session guard before CurrentSchool is bound.
        if (static::appliesSchoolScope()) {
            static::addGlobalScope(new SchoolScope);
        }

        static::creating(function (Model $model): void {
            if ($model->getAttribute('school_id') !== null) {
                return;
            }

            $schoolId = CurrentSchool::id();

            if ($schoolId !== null) {
                $model->setAttribute('school_id', $schoolId);
            }
        });
    }

    /**
     * Override and return false on models that authentication must resolve
     * before the current school is known (e.g. {@see User}).
     */
    protected static function appliesSchoolScope(): bool
    {
        return true;
    }

    /**
     * @return BelongsTo<School, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
