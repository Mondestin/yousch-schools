<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\CycleSchedule;
use App\Models\FeeTariff;
use App\Models\GradeLevel;
use App\Models\Mention;
use App\Models\SchoolProfile;
use App\Models\Term;
use App\Models\Track;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SchoolTaxonomySeeder extends Seeder
{
    /**
     * Seed school taxonomy tables from the JS mock fixture.
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

        $this->seedProfile($dataset['profile']);
        $this->seedFees($dataset['fees']);
        $this->seedAcademicYears($dataset['academicYears']);
        $this->seedTerms($dataset['terms']);
        $this->seedGradeLevels($dataset['gradeLevels']);
        $this->seedTracks($dataset['tracks']);
        $this->seedClassrooms($dataset['classrooms']);
        $this->seedVenues($dataset['venues']);
        $this->seedSchedules($dataset['schedules']);
        $this->seedMentions($dataset['mentions']);
    }

    /**
     * @param  array<string, mixed>  $profile
     */
    private function seedProfile(array $profile): void
    {
        $attributes = [
            'name' => $profile['name'],
            'promoter_name' => $profile['promoterName'],
            'director_name' => $profile['directorName'],
            'city' => $profile['city'],
            'country' => $profile['country'],
            'phone' => $profile['phone'],
            'email' => $profile['email'],
            'address' => $profile['address'],
            'motto' => $profile['motto'],
            'currency' => $profile['currency'],
            'logo_url' => $profile['logoUrl'],
            'stamp_url' => $profile['stampUrl'],
        ];

        $existing = SchoolProfile::query()->first();

        if ($existing !== null) {
            $existing->update($attributes);

            return;
        }

        SchoolProfile::query()->create($attributes);
    }

    /**
     * @param  list<array<string, mixed>>  $fees
     */
    private function seedFees(array $fees): void
    {
        foreach ($fees as $fee) {
            FeeTariff::query()->updateOrCreate(
                ['cycle' => $fee['cycle']],
                [
                    'monthly_amount' => $fee['monthlyAmount'],
                    'enrollment_amount' => $fee['enrollmentAmount'],
                    're_enrollment_amount' => $fee['reEnrollmentAmount'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $years
     */
    private function seedAcademicYears(array $years): void
    {
        foreach ($years as $year) {
            AcademicYear::query()->updateOrCreate(
                ['id' => $year['id']],
                [
                    'label' => $year['label'],
                    'starts_on' => $year['startsOn'],
                    'ends_on' => $year['endsOn'],
                    'is_current' => $year['isCurrent'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $terms
     */
    private function seedTerms(array $terms): void
    {
        foreach ($terms as $term) {
            Term::query()->updateOrCreate(
                ['id' => $term['id']],
                [
                    'academic_year_id' => $term['academicYearId'],
                    'name' => $term['name'],
                    'position' => $term['position'],
                    'starts_on' => $term['startsOn'],
                    'ends_on' => $term['endsOn'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $gradeLevels
     */
    private function seedGradeLevels(array $gradeLevels): void
    {
        foreach ($gradeLevels as $gradeLevel) {
            GradeLevel::query()->updateOrCreate(
                ['id' => $gradeLevel['id']],
                [
                    'cycle' => $gradeLevel['cycle'],
                    'code' => $gradeLevel['code'],
                    'name' => $gradeLevel['name'],
                    'position' => $gradeLevel['position'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $tracks
     */
    private function seedTracks(array $tracks): void
    {
        foreach ($tracks as $track) {
            Track::query()->updateOrCreate(
                ['id' => $track['id']],
                [
                    'cycle' => $track['cycle'],
                    'code' => $track['code'],
                    'name' => $track['name'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $classrooms
     */
    private function seedClassrooms(array $classrooms): void
    {
        foreach ($classrooms as $classroom) {
            Classroom::query()->updateOrCreate(
                ['id' => $classroom['id']],
                [
                    'academic_year_id' => $classroom['academicYearId'],
                    'cycle' => $classroom['cycle'],
                    'grade_level_id' => $classroom['gradeLevelId'],
                    'track_id' => $classroom['trackId'],
                    'code' => $classroom['code'],
                    'name' => $classroom['name'],
                    'section' => $classroom['section'],
                    'capacity' => $classroom['capacity'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $venues
     */
    private function seedVenues(array $venues): void
    {
        foreach ($venues as $venue) {
            Venue::query()->updateOrCreate(
                ['id' => $venue['id']],
                [
                    'name' => $venue['name'],
                    'kind' => $venue['kind'],
                    'building' => $venue['building'],
                    'capacity' => $venue['capacity'],
                    'available' => $venue['available'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $schedules
     */
    private function seedSchedules(array $schedules): void
    {
        foreach ($schedules as $schedule) {
            CycleSchedule::query()->updateOrCreate(
                ['cycle' => $schedule['cycle']],
                [
                    'hours' => $schedule['hours'],
                    'periods' => $schedule['periods'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $mentions
     */
    private function seedMentions(array $mentions): void
    {
        foreach ($mentions as $mention) {
            Mention::query()->updateOrCreate(
                ['code' => $mention['code']],
                [
                    'label' => $mention['label'],
                    'min' => $mention['min'],
                    'max' => $mention['max'],
                ],
            );
        }
    }
}
