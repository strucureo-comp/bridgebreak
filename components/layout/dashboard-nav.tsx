'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    FolderKanban,
    FileText,
    MessageSquare,
    Calendar,
    Users,
    DollarSign,
    UserCog,
    Settings,
    CreditCard,
} from 'lucide-react';

interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    role?: 'client' | 'admin';
}

const clientNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        role: 'client',
    },
    {
        title: 'Projects',
        href: '/projects',
        icon: FolderKanban,
        role: 'client',
    },
    {
        title: 'Invoices',
        href: '/invoices',
        icon: FileText,
        role: 'client',
    },
    {
        title: 'Support',
        href: '/support',
        icon: MessageSquare,
        role: 'client',
    },
    {
        title: 'Meetings',
        href: '/meetings',
        icon: Calendar,
        role: 'client',
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        role: 'admin',
    },
    {
        title: 'Projects',
        href: '/admin/projects',
        icon: FolderKanban,
        role: 'admin',
    },
    {
        title: 'Clients',
        href: '/admin/clients',
        icon: Users,
        role: 'admin',
    },
    {
        title: 'Support',
        href: '/admin/support',
        icon: MessageSquare,
        role: 'admin',
    },
    {
        title: 'Meetings',
        href: '/admin/meetings',
        icon: Calendar,
        role: 'admin',
    },
    {
        title: 'Invoices',
        href: '/admin/invoices',
        icon: FileText,
        role: 'admin',
    },
    {
        title: 'Finance',
        href: '/admin/finance',
        icon: DollarSign,
        role: 'admin',
    },
    {
        title: 'Team',
        href: '/admin/team',
        icon: UserCog,
        role: 'admin',
    },
    {
        title: 'Plans',
        href: '/admin/plans',
        icon: CreditCard,
        role: 'admin',
    },
    {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        role: 'admin',
    },
];

interface DashboardNavProps {
    onNavClick?: () => void;
}

// ... (imports remain the same)
export function DashboardNav({ onNavClick }: DashboardNavProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    const allowedFinanceEmails = [
        'viyasramachandran@gmail.com',
        'aathish@strucureo.works',
        'aathihacker2004@gmail.com',
    ];

    let navItems = user?.role === 'admin' ? adminNavItems : clientNavItems;

    // Filter out Finance tab if user is not authorized
    if (user?.role === 'admin') {
        navItems = navItems.filter(item => {
            if (item.title === 'Finance') {
                return user.email && allowedFinanceEmails.includes(user.email.toLowerCase()); // Ensure lower case match
            }
            return true;
        });
    }

    return (
        <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavClick}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
