<?php

namespace Database\Seeders;

use App\Models\SchoolSubscription;
use App\Models\SubscriptionReceipt;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class SchoolStaffSeeder extends Seeder
{
    /**
     * Seed staff seats and the school subscription from school.json.
     */
    public function run(): void
    {
        /** @var array<string, mixed> $dataset */
        $dataset = json_decode(
            File::get(resource_path('js/mocks/school.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        $this->seedStaff($dataset['staffUsers']);
        $this->seedSubscription($dataset['subscription']);
    }

    /**
     * @param  list<array<string, mixed>>  $staffUsers
     */
    private function seedStaff(array $staffUsers): void
    {
        foreach ($staffUsers as $staff) {
            User::query()->updateOrCreate(
                ['email' => $staff['email']],
                [
                    'name' => $staff['name'],
                    'phone' => $staff['phone'],
                    'role' => $staff['role'],
                    'cycles' => $staff['cycles'],
                    'last_seen_at' => $staff['lastSeenAt'] ?? null,
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                ],
            );
        }
    }

    /**
     * @param  array<string, mixed>  $subscription
     */
    private function seedSubscription(array $subscription): void
    {
        SchoolSubscription::query()->updateOrCreate(
            ['id' => 'sub-main'],
            [
                'plan' => $subscription['plan'],
                'status' => $subscription['status'],
                'seats' => $subscription['seats'],
                'used_seats' => $subscription['usedSeats'],
                'renews_on' => $subscription['renewsOn'],
                'monthly_amount' => $subscription['monthlyAmount'],
            ],
        );

        foreach ($subscription['receipts'] as $receipt) {
            SubscriptionReceipt::query()->updateOrCreate(
                ['id' => $receipt['id']],
                [
                    'school_subscription_id' => 'sub-main',
                    'reference' => $receipt['reference'],
                    'period_label' => $receipt['periodLabel'],
                    'paid_on' => $receipt['paidOn'],
                    'amount' => $receipt['amount'],
                    'plan' => $receipt['plan'],
                    'method' => $receipt['method'],
                    'status' => $receipt['status'],
                ],
            );
        }
    }
}
