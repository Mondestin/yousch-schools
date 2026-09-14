<?php

return [
    /*
    |--------------------------------------------------------------------------
    | YouSch Mobile Money collection numbers
    |--------------------------------------------------------------------------
    |
    | Schools send subscription payments to these accounts. The operator
    | preference is stored per school; the destination number is fixed.
    |
    */
    'mobile_money' => [
        'airtel' => env('YOUSCH_MOMO_AIRTEL', '+242065211234'),
        'mtn' => env('YOUSCH_MOMO_MTN', '+242055512345'),
    ],
];
