import { useState } from 'react';
import { useLocation } from 'wouter';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { DashboardOverview } from './DashboardOverview';
import { OrderManagement } from './OrderManagement';
import { UserManagement } from './UserManagement';
import { ProductCatalog } from './ProductCatalog';
import { NotificationCenter } from './NotificationCenter';
import { SystemSettings } from './SystemSettings';

export function AdminDashboard() {
  const [location] = useLocation();

  // Aktiven Bereich basierend auf der URL bestimmen
  const getActiveSection = () => {
    console.log("Current location:", location);
    // Exakte URL-Matches
    if (location === '/admin/orders') return 'orders';
    if (location === '/admin/users') return 'users';
    if (location === '/admin/products') return 'products';
    if (location === '/admin/notifications') return 'notifications';
    if (location === '/admin/settings') return 'settings';
    // Für exakten Match auf /admin
    if (location === '/admin') return 'dashboard';
    // Fallback für Dashboard, falls keine andere Seite passt
    return 'dashboard';
  };

  const renderContent = () => {
    const activeSection = getActiveSection();

    switch (activeSection) {
      case 'orders':
        return <OrderManagement />;
      case 'users':
        return <UserManagement />;
      case 'products':
        return <ProductCatalog />;
      case 'notifications':
        return <NotificationCenter />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <AdminHeader />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}