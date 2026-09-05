<?php

namespace Database\Seeders;

use App\Models\Admission;
use App\Models\DossierFile;
use App\Models\Reenrollment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SchoolAdmissionsSeeder extends Seeder
{
    public function run(): void
    {
        if (! Student::query()->exists()) {
            return;
        }

        /** @var array<string, mixed> $dataset */
        $dataset = json_decode(
            File::get(resource_path('js/mocks/school.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        foreach ($dataset['admissions'] as $admission) {
            Admission::query()->updateOrCreate(
                ['id' => $admission['id']],
                [
                    'academic_year_id' => $admission['academicYearId'],
                    'cycle' => $admission['cycle'],
                    'classroom_id' => $admission['classroomId'],
                    'track_id' => $admission['trackId'] ?? null,
                    'submitted_on' => $admission['submittedOn'],
                    'status' => $admission['status'],
                    'first_name' => $admission['firstName'],
                    'last_name' => $admission['lastName'],
                    'gender' => $admission['gender'],
                    'born_on' => $admission['bornOn'],
                    'city' => $admission['city'],
                    'neighborhood' => $admission['neighborhood'],
                    'address' => $admission['address'] ?? null,
                    'phone' => $admission['phone'] ?? null,
                    'guardian_last_name' => $admission['guardianLastName'],
                    'guardian_first_name' => $admission['guardianFirstName'],
                    'guardian_phone' => $admission['guardianPhone'],
                    'guardian_relation' => $admission['guardianRelation'],
                    'notes' => $admission['notes'] ?? null,
                    'student_id' => $admission['studentId'] ?? null,
                ],
            );

            $this->seedFiles(Admission::class, $admission['id'], $admission['files'] ?? []);
        }

        foreach ($dataset['reenrollments'] as $reenrollment) {
            Reenrollment::query()->updateOrCreate(
                ['id' => $reenrollment['id']],
                [
                    'academic_year_id' => $reenrollment['academicYearId'],
                    'student_id' => $reenrollment['studentId'],
                    'previous_class' => $reenrollment['previousClass'],
                    'classroom_id' => $reenrollment['classroomId'],
                    'track_id' => $reenrollment['trackId'] ?? null,
                    'submitted_on' => $reenrollment['submittedOn'],
                    'status' => $reenrollment['status'],
                    'notes' => $reenrollment['notes'] ?? null,
                ],
            );

            $this->seedFiles(Reenrollment::class, $reenrollment['id'], $reenrollment['files'] ?? []);
        }
    }

    /**
     * @param  class-string<Model>  $fileableType
     * @param  list<array<string, mixed>>  $files
     */
    private function seedFiles(string $fileableType, string $fileableId, array $files): void
    {
        foreach ($files as $file) {
            DossierFile::query()->updateOrCreate(
                ['id' => $file['id']],
                [
                    'fileable_type' => $fileableType,
                    'fileable_id' => $fileableId,
                    'name' => $file['name'],
                    'url' => $file['url'],
                    'mime' => $file['mime'],
                ],
            );
        }
    }
}
