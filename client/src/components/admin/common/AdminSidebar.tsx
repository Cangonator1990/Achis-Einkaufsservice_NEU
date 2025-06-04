import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import {
  IconHome,
  IconUsers,
  IconShoppingCart,
  IconPackage,
  IconChartBar,
  IconSettings,
  IconBellRinging,
  IconLayoutDashboard,
} from '@tabler/icons-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: boolean | string;
}

/**
 * Einzelnes Navigationselement für die Sidebar
 */
function NavItem({ href, label, icon, match }: NavItemProps) {
  const [location] = useLocation();
  
  // Prüfe, ob der aktuelle Pfad mit dem href oder dem match-Parameter übereinstimmt
  const isActive = match 
    ? typeof match === 'boolean' 
      ? match 
      : location.startsWith(match)
    : location === href;

  return (
    <div className="w-full">
      <Link href={href}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-primary text-white"
              : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
          )}
        >
          <span className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-500")}>
            {icon}
          </span>
          <span>{label}</span>
        </div>
      </Link>
    </div>
  );
}

/**
 * Sidebar-Komponente für den Admin-Bereich
 */
export function AdminSidebar() {
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: <IconLayoutDashboard />, match: '/admin' },
    { href: '/admin/users', label: 'Benutzerverwaltung', icon: <IconUsers />, match: '/admin/users' },
    { href: '/admin/orders', label: 'Bestellungen', icon: <IconShoppingCart />, match: '/admin/orders' },
    { href: '/admin/products', label: 'Produkte', icon: <IconPackage />, match: '/admin/products' },
    { href: '/admin/notifications', label: 'Benachrichtigungen', icon: <IconBellRinging />, match: '/admin/notifications' },
    { href: '/admin/reports', label: 'Berichte', icon: <IconChartBar />, match: '/admin/reports' },
    { href: '/admin/settings', label: 'Einstellungen', icon: <IconSettings />, match: '/admin/settings' },
  ];

  return (
    <div className="hidden w-64 flex-col border-r bg-background p-6 md:flex">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Administration</h2>
        <nav className="flex flex-col gap-1">
          {navItems.map((item, index) => (
            <NavItem key={index} {...item} />
          ))}
        </nav>
      </div>
      
      <div className="mt-auto pt-6">
        <NavItem
          href="/"
          label="Zur Website"
          icon={<IconHome />}
          match={false}
        />
      </div>
    </div>
  );
}