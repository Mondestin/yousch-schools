import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <img
                src="/logo.png"
                alt={String(name)}
                className="h-8 w-auto object-contain group-data-[collapsible=icon]:hidden"
            />
            <AppLogoIcon className="hidden size-8 rounded-md group-data-[collapsible=icon]:block" />
        </>
    );
}
