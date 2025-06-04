import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconUsers,
  IconShoppingCart,
  IconTruck,
  IconChartBar,
} from '@tabler/icons-react';

/**
 * Interface für die Dashboard-Statistiken
 */
interface DashboardStats {
  totalOrders: number;
  newOrders: number;
  totalUsers: number;
  upcomingDeliveries: number;
}

/**
 * Statistik-Karte für das Admin-Dashboard
 */
function StatCard({ 
  title, 
  value, 
  icon, 
  description,
  change,
  loading = false,
}: { 
  title: string; 
  value: number | string;
  icon: React.ReactNode; 
  description?: string;
  change?: { value: number; type: 'increase' | 'decrease' | 'neutral' };
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold">{value}</p>
                {change && (
                  <span className={`text-sm font-medium ${
                    change.type === 'increase' 
                      ? 'text-green-500' 
                      : change.type === 'decrease' 
                        ? 'text-red-500' 
                        : 'text-gray-500'
                  }`}>
                    {change.value > 0 ? '+' : ''}{change.value}%
                  </span>
                )}
              </div>
            )}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          <div className={`rounded-full p-3 ${
            loading 
              ? 'bg-gray-100' 
              : 'bg-primary/10'
          }`}>
            <div className={loading ? 'opacity-50' : ''}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard-Statistiken-Komponente
 */
export function DashboardStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/stats'],
    queryFn: async () => {
      console.log("Fetching admin dashboard stats");
      return apiRequest('/api/admin/dashboard/stats');
    }
  });

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Gesamtbestellungen"
        value={stats?.totalOrders || 0}
        icon={<IconShoppingCart className="h-6 w-6 text-primary" />}
        loading={isLoading}
      />
      
      <StatCard
        title="Neue Bestellungen"
        value={stats?.newOrders || 0}
        icon={<IconChartBar className="h-6 w-6 text-primary" />}
        description="Seit dem letzten Monat"
        change={{ value: 12, type: 'increase' }}
        loading={isLoading}
      />
      
      <StatCard
        title="Registrierte Benutzer"
        value={stats?.totalUsers || 0}
        icon={<IconUsers className="h-6 w-6 text-primary" />}
        loading={isLoading}
      />
      
      <StatCard
        title="Anstehende Lieferungen"
        value={stats?.upcomingDeliveries || 0}
        icon={<IconTruck className="h-6 w-6 text-primary" />}
        loading={isLoading}
      />
    </div>
  );
}