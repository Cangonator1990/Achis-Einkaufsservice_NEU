import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  IconHome,
  IconShoppingCart,
  IconUsers,
  IconBuildingStore,
  IconBell,
  IconSettings,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react';

// SidebarItem-Komponente
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

function SidebarItem({
  icon,
  label,
  href,
  isActive,
  isCollapsed,
  onClick
}: SidebarItemProps) {
  const [, setLocation] = useLocation();

  const navigateTo = () => {
    setLocation(href);
    if (onClick) onClick();
  };

  return (
    <button
      onClick={navigateTo}
      className={`
        w-full flex items-center p-2 my-1 rounded-md
        ${isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'}
        transition-colors
      `}
    >
      <div className="flex items-center justify-center">
        <span className="relative">
          {icon}
        </span>
      </div>
      
      {!isCollapsed && (
        <span className="ml-3">{label}</span>
      )}
    </button>
  );
}

export function AdminSidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className={`
      bg-background border-r flex flex-col h-full
      ${isCollapsed ? 'w-16' : 'w-64'} 
      transition-all duration-300
    `}>
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="font-bold text-lg">Admin-Dashboard</div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      <div className="flex-1 py-4 px-2 overflow-y-auto">
        <SidebarItem
          icon={<IconHome size={24} />}
          label="Dashboard"
          href="/admin"
          isActive={isActive('/admin')}
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          icon={<IconShoppingCart size={24} />}
          label="Bestellungen"
          href="/admin/orders"
          isActive={isActive('/admin/orders')}
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          icon={<IconUsers size={24} />}
          label="Benutzer"
          href="/admin/users"
          isActive={isActive('/admin/users')}
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          icon={<IconBuildingStore size={24} />}
          label="Produkte"
          href="/admin/products"
          isActive={isActive('/admin/products')}
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          icon={<IconBell size={24} />}
          label="Benachrichtigungen"
          href="/admin/notifications"
          isActive={isActive('/admin/notifications')}
          isCollapsed={isCollapsed}
        />
        <SidebarItem
          icon={<IconSettings size={24} />}
          label="Einstellungen"
          href="/admin/settings"
          isActive={isActive('/admin/settings')}
          isCollapsed={isCollapsed}
        />
      </div>

      <div className="p-4 border-t">
        {!isCollapsed && (
          <div className="text-sm text-gray-500">
            Version 1.0.0
          </div>
        )}
      </div>
    </div>
  );
}