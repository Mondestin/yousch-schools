<?php

namespace App\Support\Api;

/**
 * Documents the JSON contract shared by web and mobile clients.
 * Field names match resources/js/types/school.ts (camelCase).
 */
final class ApiContract
{
    public const VERSION = 'v1';

    public const PREFIX = 'api/v1';

    /**
     * @return list<string>
     */
    public static function datasetKeys(): array
    {
        return [
            'profile',
            'subscription',
            'cycles',
            'fees',
            'academicYears',
            'terms',
            'gradeLevels',
            'tracks',
            'classrooms',
            'venues',
            'schedules',
            'students',
            'guardians',
            'studentGuardians',
            'teachers',
            'teacherAssignments',
            'subjects',
            'enrollments',
            'admissions',
            'reenrollments',
            'assessments',
            'timetableSlots',
            'grades',
            'payments',
            'attendance',
            'staffAttendance',
            'attendanceSessions',
            'markingWindows',
            'inventory',
            'cashMovements',
            'announcements',
            'sanctions',
            'identityCards',
            'mentions',
            'roles',
            'staffUsers',
        ];
    }

    /**
     * Public + authenticated resources for mobile (same as web).
     *
     * @return list<array{name: string, methods: list<string>, path: string, auth: bool}>
     */
    public static function resources(): array
    {
        return [
            ['name' => 'meta.contract', 'methods' => ['GET'], 'path' => '/meta/contract', 'auth' => false],
            ['name' => 'meta.enums', 'methods' => ['GET'], 'path' => '/meta/enums', 'auth' => false],
            ['name' => 'auth.login', 'methods' => ['POST'], 'path' => '/login', 'auth' => false],
            ['name' => 'auth.login.verify', 'methods' => ['POST'], 'path' => '/login/verify', 'auth' => false],
            ['name' => 'auth.login.resend', 'methods' => ['POST'], 'path' => '/login/resend', 'auth' => false],
            ['name' => 'auth.logout', 'methods' => ['POST'], 'path' => '/logout', 'auth' => true],
            ['name' => 'auth.me', 'methods' => ['GET'], 'path' => '/me', 'auth' => true],
            ['name' => 'portal.me', 'methods' => ['GET'], 'path' => '/portal/me', 'auth' => true],
            ['name' => 'portal.students', 'methods' => ['GET'], 'path' => '/portal/students', 'auth' => true],
            ['name' => 'portal.students.show', 'methods' => ['GET'], 'path' => '/portal/students/{id}', 'auth' => true],
            ['name' => 'portal.students.profile', 'methods' => ['GET'], 'path' => '/portal/students/{id}/profile', 'auth' => true],
            ['name' => 'portal.students.bulletin', 'methods' => ['GET'], 'path' => '/portal/students/{id}/bulletin', 'auth' => true],
            ['name' => 'portal.students.notes', 'methods' => ['GET'], 'path' => '/portal/students/{id}/notes', 'auth' => true],
            ['name' => 'portal.students.grades', 'methods' => ['GET'], 'path' => '/portal/students/{id}/grades', 'auth' => true],
            ['name' => 'portal.students.payments', 'methods' => ['GET'], 'path' => '/portal/students/{id}/payments', 'auth' => true],
            ['name' => 'portal.students.receipt', 'methods' => ['GET'], 'path' => '/portal/students/{id}/receipt', 'auth' => true],
            ['name' => 'portal.students.presences', 'methods' => ['GET'], 'path' => '/portal/students/{id}/presences', 'auth' => true],
            ['name' => 'portal.students.attendance', 'methods' => ['GET'], 'path' => '/portal/students/{id}/attendance', 'auth' => true],
            ['name' => 'portal.students.files', 'methods' => ['GET'], 'path' => '/portal/students/{id}/files', 'auth' => true],
            ['name' => 'portal.students.sanctions', 'methods' => ['GET'], 'path' => '/portal/students/{id}/sanctions', 'auth' => true],
            ['name' => 'portal.students.planning', 'methods' => ['GET'], 'path' => '/portal/students/{id}/planning', 'auth' => true],
            ['name' => 'portal.students.timetable', 'methods' => ['GET'], 'path' => '/portal/students/{id}/timetable', 'auth' => true],
            ['name' => 'portal.announcements', 'methods' => ['GET'], 'path' => '/portal/announcements', 'auth' => true],
            ['name' => 'subscription', 'methods' => ['GET'], 'path' => '/subscription', 'auth' => true],
            ['name' => 'subscription.plan', 'methods' => ['PUT'], 'path' => '/subscription/plan', 'auth' => true],
            ['name' => 'subscription.billing', 'methods' => ['PUT'], 'path' => '/subscription/billing', 'auth' => true],
            ['name' => 'subscription.payment', 'methods' => ['PUT'], 'path' => '/subscription/payment', 'auth' => true],
            ['name' => 'subscription.cancel', 'methods' => ['POST'], 'path' => '/subscription/cancel', 'auth' => true],
            ['name' => 'catalog', 'methods' => ['GET'], 'path' => '/catalog', 'auth' => true],
            ['name' => 'school.profile', 'methods' => ['GET', 'PUT', 'POST'], 'path' => '/school/profile', 'auth' => true],
            ['name' => 'school.fees', 'methods' => ['GET', 'PUT'], 'path' => '/school/fees', 'auth' => true],
            ['name' => 'school.schedules', 'methods' => ['GET', 'PUT'], 'path' => '/school/schedules', 'auth' => true],
            ['name' => 'school.venues', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/school/venues', 'auth' => true],
            ['name' => 'academic-years', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/academic-years', 'auth' => true],
            ['name' => 'terms', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/terms', 'auth' => true],
            ['name' => 'classrooms', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/classrooms', 'auth' => true],
            ['name' => 'tracks', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/tracks', 'auth' => true],
            ['name' => 'students', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/students', 'auth' => true],
            ['name' => 'students.bulletin', 'methods' => ['GET'], 'path' => '/students/{id}/bulletin', 'auth' => true],
            ['name' => 'students.receipt', 'methods' => ['GET'], 'path' => '/students/{id}/receipt', 'auth' => true],
            ['name' => 'students.documents', 'methods' => ['GET'], 'path' => '/students/{id}/documents', 'auth' => true],
            ['name' => 'students.files', 'methods' => ['GET'], 'path' => '/students/{id}/files', 'auth' => true],
            ['name' => 'enrollments', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/enrollments', 'auth' => true],
            ['name' => 'guardians', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/guardians', 'auth' => true],
            ['name' => 'admissions', 'methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'path' => '/admissions', 'auth' => true],
            ['name' => 'reenrollments', 'methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'path' => '/reenrollments', 'auth' => true],
            ['name' => 'teachers', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/teachers', 'auth' => true],
            ['name' => 'subjects', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/subjects', 'auth' => true],
            ['name' => 'teacher-assignments', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/teacher-assignments', 'auth' => true],
            ['name' => 'timetable-slots', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/timetable-slots', 'auth' => true],
            ['name' => 'attendance', 'methods' => ['GET', 'PUT', 'DELETE'], 'path' => '/attendance', 'auth' => true],
            ['name' => 'staff-attendance', 'methods' => ['GET', 'PUT'], 'path' => '/staff-attendance', 'auth' => true],
            ['name' => 'staff-attendance.sessions', 'methods' => ['GET'], 'path' => '/staff-attendance/sessions', 'auth' => true],
            ['name' => 'staff-attendance.sign', 'methods' => ['POST'], 'path' => '/staff-attendance/sign', 'auth' => true],
            ['name' => 'marking-windows', 'methods' => ['GET', 'POST', 'PUT'], 'path' => '/marking-windows', 'auth' => true],
            ['name' => 'marking-windows.close', 'methods' => ['POST'], 'path' => '/marking-windows/{id}/close', 'auth' => true],
            ['name' => 'marking-windows.reopen', 'methods' => ['POST'], 'path' => '/marking-windows/{id}/reopen', 'auth' => true],
            ['name' => 'marking-windows.notify', 'methods' => ['POST'], 'path' => '/marking-windows/{id}/notify', 'auth' => true],
            ['name' => 'assessments', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/assessments', 'auth' => true],
            ['name' => 'grades', 'methods' => ['GET', 'PUT', 'DELETE'], 'path' => '/grades', 'auth' => true],
            ['name' => 'classrooms.results', 'methods' => ['GET'], 'path' => '/classrooms/{id}/results', 'auth' => true],
            ['name' => 'payments', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/payments', 'auth' => true],
            ['name' => 'cash-movements', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/cash-movements', 'auth' => true],
            ['name' => 'inventory', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/inventory', 'auth' => true],
            ['name' => 'announcements', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/announcements', 'auth' => true],
            ['name' => 'sanctions', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/sanctions', 'auth' => true],
            ['name' => 'identity-cards', 'methods' => ['GET'], 'path' => '/identity-cards', 'auth' => true],
            ['name' => 'identity-cards.theme', 'methods' => ['PUT'], 'path' => '/identity-cards/theme', 'auth' => true],
            ['name' => 'identity-cards.print', 'methods' => ['POST'], 'path' => '/identity-cards/print', 'auth' => true],
            ['name' => 'identity-cards.block', 'methods' => ['POST'], 'path' => '/identity-cards/block', 'auth' => true],
            ['name' => 'identity-cards.unblock', 'methods' => ['POST'], 'path' => '/identity-cards/unblock', 'auth' => true],
            ['name' => 'identity-cards.revoke', 'methods' => ['POST'], 'path' => '/identity-cards/revoke', 'auth' => true],
            ['name' => 'staff', 'methods' => ['GET', 'POST', 'PUT', 'DELETE'], 'path' => '/staff', 'auth' => true],
        ];
    }
}
