<?php

namespace App\Models\Scopes;

use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class SchoolScope implements Scope
{
    /**
     * @param  Builder<Model>  $builder
     */
    public function apply(Builder $builder, Model $model): void
    {
        $schoolId = CurrentSchool::id();

        if ($schoolId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $builder->where($model->getTable().'.school_id', $schoolId);
    }
}
