import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AssessmentLayout from '@/layouts/assessment/layout';
import AuthLayout from '@/layouts/auth-layout';
import CashLayout from '@/layouts/cash/layout';
import PupilsLayout from '@/layouts/pupils/layout';
import SchoolLayout from '@/layouts/school/layout';
import SettingsLayout from '@/layouts/settings/layout';
import StudentLayout from '@/layouts/student/layout';
import StructureLayout from '@/layouts/structure/layout';

const appName = import.meta.env.VITE_APP_NAME || 'YouSchlow';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name.startsWith('etablissement/'):
                return [AppLayout, SchoolLayout];
            case name.startsWith('structure/'):
                return [AppLayout, StructureLayout];
            case name === 'payments/index' || name === 'cash/index':
                return [AppLayout, CashLayout];
            case name.startsWith('assessments/'):
                return [AppLayout, AssessmentLayout];
            case name === 'students/index' ||
                name === 'students/admissions' ||
                name === 'students/reenrollments':
                return [AppLayout, PupilsLayout];
            case name.startsWith('students/') &&
                name !== 'students/index' &&
                name !== 'students/create' &&
                name !== 'students/admissions' &&
                name !== 'students/reenrollments':
                return [AppLayout, StudentLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#6425d0',
    },
});

// This will set light / dark mode on load...
initializeTheme();
