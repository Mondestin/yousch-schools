import type { Auth } from '@/types/auth';
import type { SchoolContext, SchoolDataset } from '@/types/school';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            currentSchool: {
                id: string;
                name: string;
                domain: string;
                status: string;
            } | null;
            schoolContext: SchoolContext;
            catalog: SchoolDataset | null;
            [key: string]: unknown;
        };
    }
}
