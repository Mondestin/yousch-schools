<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\DossierFile;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class SchoolPeopleSeeder extends Seeder
{
    /**
     * Seed students, guardians, teachers, subjects, and related rows from the JS mock fixture.
     */
    public function run(): void
    {
        if (! AcademicYear::query()->exists()) {
            return;
        }

        /** @var array<string, mixed> $dataset */
        $dataset = json_decode(
            File::get(resource_path('js/mocks/school.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        $this->seedStudents($dataset['students']);
        $this->seedGuardians($dataset['guardians']);
        $this->seedStudentGuardians($dataset['studentGuardians']);
        $this->seedTeachers($dataset['teachers']);
        $this->seedSubjects($dataset['subjects']);
        $this->seedEnrollments($dataset['enrollments']);
        $this->seedTeacherAssignments($dataset['teacherAssignments']);
    }

    /**
     * @param  list<array<string, mixed>>  $students
     */
    private function seedStudents(array $students): void
    {
        foreach ($students as $student) {
            Student::query()->updateOrCreate(
                ['id' => $student['id']],
                [
                    'matricule' => $student['matricule'],
                    'first_name' => $student['firstName'],
                    'last_name' => $student['lastName'],
                    'gender' => $student['gender'],
                    'born_on' => $student['bornOn'],
                    'city' => $student['city'],
                    'neighborhood' => $student['neighborhood'],
                    'address' => $student['address'] ?? null,
                    'phone' => $student['phone'] ?? null,
                    'email' => $student['email'] ?? null,
                    'enrolled_on' => $student['enrolledOn'],
                    'photo_url' => $student['photoUrl'] ?? null,
                ],
            );

            $this->seedFiles(
                Student::class,
                $student['id'],
                $student['files'] ?? [],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $guardians
     */
    private function seedGuardians(array $guardians): void
    {
        foreach ($guardians as $guardian) {
            Guardian::query()->updateOrCreate(
                ['id' => $guardian['id']],
                [
                    'first_name' => $guardian['firstName'],
                    'last_name' => $guardian['lastName'],
                    'phone' => $guardian['phone'],
                    'profession' => $guardian['profession'],
                    'gender' => $guardian['gender'] ?? null,
                    'email' => $guardian['email'] ?? null,
                    'city' => $guardian['city'] ?? null,
                    'neighborhood' => $guardian['neighborhood'] ?? null,
                    'address' => $guardian['address'] ?? null,
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $links
     */
    private function seedStudentGuardians(array $links): void
    {
        $now = now();

        foreach ($links as $link) {
            $keys = [
                'student_id' => $link['studentId'],
                'guardian_id' => $link['guardianId'],
            ];

            $exists = DB::table('student_guardian')->where($keys)->exists();

            if ($exists) {
                DB::table('student_guardian')->where($keys)->update([
                    'relation' => $link['relation'],
                    'updated_at' => $now,
                ]);

                continue;
            }

            DB::table('student_guardian')->insert([
                ...$keys,
                'relation' => $link['relation'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $teachers
     */
    private function seedTeachers(array $teachers): void
    {
        foreach ($teachers as $teacher) {
            Teacher::query()->updateOrCreate(
                ['id' => $teacher['id']],
                [
                    'code' => $teacher['code'],
                    'first_name' => $teacher['firstName'],
                    'last_name' => $teacher['lastName'],
                    'phone' => $teacher['phone'],
                    'gender' => $teacher['gender'],
                    'qualification' => $teacher['qualification'],
                    'hired_on' => $teacher['hiredOn'],
                    'born_on' => $teacher['bornOn'] ?? null,
                    'email' => $teacher['email'] ?? null,
                    'address' => $teacher['address'] ?? null,
                    'position' => $teacher['position'] ?? null,
                    'city' => $teacher['city'],
                    'neighborhood' => $teacher['neighborhood'],
                    'marital_status' => $teacher['maritalStatus'],
                    'status' => $teacher['status'],
                    'photo_url' => $teacher['photoUrl'] ?? null,
                ],
            );

            $this->seedFiles(
                Teacher::class,
                $teacher['id'],
                $teacher['files'] ?? [],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $subjects
     */
    private function seedSubjects(array $subjects): void
    {
        foreach ($subjects as $subject) {
            Subject::query()->updateOrCreate(
                ['id' => $subject['id']],
                [
                    'code' => $subject['code'],
                    'name' => $subject['name'],
                    'textbook' => $subject['textbook'] ?? null,
                    'coefficient' => $subject['coefficient'] ?? null,
                    'cycle' => $subject['cycle'],
                    'grade_level_id' => $subject['gradeLevelId'],
                    'track_id' => $subject['trackId'] ?? null,
                ],
            );

            $this->seedFiles(
                Subject::class,
                $subject['id'],
                $subject['files'] ?? [],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $enrollments
     */
    private function seedEnrollments(array $enrollments): void
    {
        foreach ($enrollments as $enrollment) {
            Enrollment::query()->updateOrCreate(
                ['id' => $enrollment['id']],
                [
                    'student_id' => $enrollment['studentId'],
                    'classroom_id' => $enrollment['classroomId'],
                    'academic_year_id' => $enrollment['academicYearId'],
                    'track_id' => $enrollment['trackId'] ?? null,
                    'status' => $enrollment['status'],
                ],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $assignments
     */
    private function seedTeacherAssignments(array $assignments): void
    {
        foreach ($assignments as $assignment) {
            TeacherAssignment::query()->updateOrCreate(
                ['id' => $assignment['id']],
                [
                    'teacher_id' => $assignment['teacherId'],
                    'academic_year_id' => $assignment['academicYearId'],
                    'classroom_id' => $assignment['classroomId'],
                    'subject_id' => $assignment['subjectId'],
                    'track_id' => $assignment['trackId'] ?? null,
                ],
            );
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
