import { useAuth } from '@/hooks/use-auth';
import { useLocation, Route } from 'wouter';
import { AdminLayout } from '@/components/admin/common/AdminLayout';
import { DashboardOverview } from '@/components/admin/dashboard/DashboardOverview';
import { UserManagement } from '@/components/admin/users/UserManagement';
import { NewOrderManagement } from '@/components/admin/orders/NewOrderManagement';

/**
 * Hauptseite für den Admin-Bereich
 */
export default function AdminPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [location, navigate] = useLocation();

  // Wenn nicht authentifiziert oder kein Admin, zur Login-Seite umleiten
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      navigate('/login?redirect=/admin');
    }
    return null;
  }

  // Wenn authentifiziert, aber kein Admin, zur Startseite umleiten
  if (!isAdmin) {
    if (typeof window !== 'undefined') {
      navigate('/');
    }
    return null;
  }

  return (
    <AdminLayout>
      <Route path="/admin" component={DashboardOverview} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/orders" component={NewOrderManagement} />
      <Route path="/admin/products">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Produktverwaltung</h1>
          <p className="text-gray-500">Diese Funktion wird in einer zukünftigen Version verfügbar sein.</p>
        </div>
      </Route>
      <Route path="/admin/notifications">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Benachrichtigungsverwaltung</h1>
          <p className="text-gray-500">Diese Funktion wird in einer zukünftigen Version verfügbar sein.</p>
        </div>
      </Route>
      <Route path="/admin/reports">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Berichte</h1>
          <p className="text-gray-500">Diese Funktion wird in einer zukünftigen Version verfügbar sein.</p>
        </div>
      </Route>
      <Route path="/admin/settings">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-gray-500">Diese Funktion wird in einer zukünftigen Version verfügbar sein.</p>
        </div>
      </Route>
    </AdminLayout>
  );
}