import { DashboardStats } from './DashboardStats';
import { RecentOrdersCard } from './RecentOrdersCard';
import { RecentUsersCard } from './RecentUsersCard';
import { AdminPageHeader } from '../common/AdminPageHeader';

/**
 * Haupt-Dashboard-Übersicht-Komponente
 */
export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Dashboard" 
        description="Willkommen im Admin-Dashboard von Achis Einkaufsservice" 
      />

      <DashboardStats />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentOrdersCard />
        <RecentUsersCard />
      </div>
    </div>
  );
}