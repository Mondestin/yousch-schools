<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AdmissionStatus;
use App\Enums\AnnouncementAudience;
use App\Enums\AssessmentType;
use App\Enums\AttendanceStatus;
use App\Enums\CashKind;
use App\Enums\Cycle;
use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Enums\InventoryCondition;
use App\Enums\InventoryStatus;
use App\Enums\MentionCode;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ReenrollmentStatus;
use App\Enums\StaffRole;
use App\Enums\SubscriptionPlan;
use App\Enums\SubscriptionStatus;
use App\Enums\TeacherStatus;
use App\Enums\VenueKind;
use App\Enums\Weekday;
use App\Http\Controllers\Controller;
use App\Support\Api\ApiContract;
use Illuminate\Http\JsonResponse;
use UnitEnum;

class MetaController extends Controller
{
    public function contract(): JsonResponse
    {
        return response()->json([
            'version' => ApiContract::VERSION,
            'prefix' => '/'.ApiContract::PREFIX,
            'datasetKeys' => ApiContract::datasetKeys(),
            'resources' => ApiContract::resources(),
            'conventions' => [
                'keys' => 'camelCase',
                'dates' => 'YYYY-MM-DD',
                'ids' => 'string (fixture id or ulid)',
                'gender' => ['femme', 'homme'],
                'genderLabels' => ['Féminin', 'Masculin'],
                'currency' => 'FCFA',
                'catalog' => 'GET /catalog assembles SchoolDataset from Eloquent when seeded',
            ],
            'clients' => ['web', 'mobile'],
            'auth' => [
                'mode' => 'session (same-origin + CSRF) or Bearer personal access token',
                'note' => 'Sanctum-compatible tokens (local HasApiTokens). Web: cookie session. Mobile: POST /login → Bearer. Types: resources/js/types/school.ts',
            ],
        ]);
    }

    public function enums(): JsonResponse
    {
        return response()->json([
            'cycle' => $this->cases(Cycle::class),
            'staffRole' => $this->cases(StaffRole::class),
            'gender' => $this->cases(Gender::class),
            'enrollmentStatus' => $this->cases(EnrollmentStatus::class),
            'admissionStatus' => $this->cases(AdmissionStatus::class),
            'reenrollmentStatus' => $this->cases(ReenrollmentStatus::class),
            'paymentStatus' => $this->cases(PaymentStatus::class),
            'paymentMethod' => $this->cases(PaymentMethod::class),
            'assessmentType' => $this->cases(AssessmentType::class),
            'weekday' => $this->cases(Weekday::class),
            'guardianRelation' => $this->cases(GuardianRelation::class),
            'mentionCode' => $this->cases(MentionCode::class),
            'venueKind' => $this->cases(VenueKind::class),
            'attendanceStatus' => $this->cases(AttendanceStatus::class),
            'inventoryCondition' => $this->cases(InventoryCondition::class),
            'inventoryStatus' => $this->cases(InventoryStatus::class),
            'cashKind' => $this->cases(CashKind::class),
            'announcementAudience' => $this->cases(AnnouncementAudience::class),
            'subscriptionPlan' => $this->cases(SubscriptionPlan::class),
            'subscriptionStatus' => $this->cases(SubscriptionStatus::class),
            'teacherStatus' => $this->cases(TeacherStatus::class),
        ]);
    }

    /**
     * @param  class-string<UnitEnum>  $enum
     * @return list<string>
     */
    private function cases(string $enum): array
    {
        return array_map(
            static fn (UnitEnum $case): string => $case instanceof \BackedEnum
                ? (string) $case->value
                : $case->name,
            $enum::cases(),
        );
    }
}
