import { Link } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Briefcase,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileText,
    FileBadge2,
    IdCard,
    GraduationCap,
    LayoutGrid,
    Megaphone,
    Package,
    School,
    Settings,
    UserCog,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useSchoolContext } from '@/hooks/use-school-context';
import { canAccess, type NavKey } from '@/lib/school-access';
import { index as announcements } from '@/routes/announcements';
import { index as documentsHub } from '@/routes/documents';
import { devoirs as assessments } from '@/routes/assessments';
import { index as attendance } from '@/routes/attendance';
import { dashboard } from '@/routes';
import { index as school } from '@/routes/etablissement';
import { index as guardians } from '@/routes/guardians';
import { index as idCards } from '@/routes/id-cards';
import { index as inventory } from '@/routes/inventory';
import { subscription } from '@/routes/organisation';
import { index as payments } from '@/routes/payments';
import { edit as profile } from '@/routes/profile';
import { index as reports } from '@/routes/reports';
import { index as structure } from '@/routes/structure';
import { index as students } from '@/routes/students';
import { index as subjects } from '@/routes/subjects';
import { index as staff } from '@/routes/staff';
import { index as timetable } from '@/routes/timetable';
import { index as teachers } from '@/routes/teachers';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { query, staffRole } = useSchoolContext();
    const { currentUrl } = useCurrentUrl();

    function items(list: Array<NavItem & { key: NavKey }>): NavItem[] {
        return list
            .filter((item) => canAccess(staffRole, item.key))
            .map(({ key: _key, ...item }) => item);
    }

    const scolarite = items([
        {
            key: 'dashboard',
            title: 'Tableau de bord',
            href: dashboard({ query }),
            icon: LayoutGrid,
        },
        {
            key: 'students',
            title: 'Élèves',
            href: students({ query }),
            icon: GraduationCap,
            match: 'prefix',
        },
        {
            key: 'guardians',
            title: 'Tuteurs',
            href: guardians({ query }),
            icon: Users,
            match: 'prefix',
        },
        {
            key: 'teachers',
            title: 'Enseignants',
            href: teachers({ query }),
            icon: Briefcase,
            match: 'prefix',
        },
        {
            key: 'subjects',
            title: 'Matières',
            href: subjects({ query }),
            icon: BookOpen,
        },
    ]);
    const pedagogie = items([
        {
            key: 'timetable',
            title: 'Emploi du temps',
            href: timetable({ query }),
            icon: CalendarDays,
        },
        {
            key: 'attendance',
            title: 'Présences',
            href: attendance({ query }),
            icon: ClipboardCheck,
        },
        {
            key: 'assessments',
            title: 'Évaluations',
            href: assessments({ query }),
            icon: ClipboardList,
            match: 'prefix',
        },
        {
            key: 'reports',
            title: 'Bulletins',
            href: reports({ query }),
            icon: FileText,
            isActive:
                currentUrl === '/bulletins' ||
                currentUrl.startsWith('/bulletins/') ||
                currentUrl === '/resultats' ||
                currentUrl.startsWith('/resultats/'),
        },
    ]);
    const administration = items([
        {
            key: 'cash',
            title: 'Caisse',
            href: payments({ query }),
            icon: Banknote,
            match: 'prefix',
        },
        {
            key: 'inventory',
            title: 'Matériel',
            href: inventory({ query }),
            icon: Package,
        },
        {
            key: 'announcements',
            title: 'Annonces',
            href: announcements({ query }),
            icon: Megaphone,
        },
        {
            key: 'documents',
            title: 'Documents',
            href: documentsHub({ query }),
            icon: FileBadge2,
            match: 'prefix',
        },
        {
            key: 'id-cards',
            title: 'Cartes d’identité',
            href: idCards({ query }),
            icon: IdCard,
        },
        {
            key: 'staff',
            title: 'Utilisateurs',
            href: staff({ query }),
            icon: UserCog,
        },
    ]);
    const organisation = items([
        {
            key: 'school',
            title: 'Établissement',
            href: school({ query }),
            icon: Building2,
            match: 'prefix',
        },
        {
            key: 'structure',
            title: 'Structure',
            href: structure({ query }),
            icon: School,
            match: 'prefix',
        },
        {
            key: 'subscription',
            title: 'Abonnement',
            href: subscription({ query }),
            icon: CreditCard,
            match: 'prefix',
        },
        {
            key: 'settings',
            title: 'Paramètres',
            href: profile({ query }),
            icon: Settings,
            match: 'prefix',
        },
    ]);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard({ query })} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {scolarite.length > 0 ? (
                    <NavMain label="Scolarité" items={scolarite} />
                ) : null}
                {pedagogie.length > 0 ? (
                    <NavMain label="Pédagogie" items={pedagogie} />
                ) : null}
                {administration.length > 0 ? (
                    <NavMain label="Administration" items={administration} />
                ) : null}
                {organisation.length > 0 ? (
                    <NavMain label="Organisation" items={organisation} />
                ) : null}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
