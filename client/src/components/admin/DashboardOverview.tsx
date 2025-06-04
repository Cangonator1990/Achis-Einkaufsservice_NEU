import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconUsers, IconShoppingCart, IconTruck, IconBuildingStore, IconChartBar, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { apiRequest } from '@/lib/queryClient';

// Definition für die Statistikkarte
interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-full text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription className="flex items-center mt-1">
          {description}
          {trend && (
            <span className={`flex items-center ml-2 ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.positive ? <IconArrowUp className="w-4 h-4 mr-1" /> : <IconArrowDown className="w-4 h-4 mr-1" />}
              {trend.value}%
            </span>
          )}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function DashboardOverview() {
  // Dashboard Status abfragen - robust mit direktem Endpunkt
  const { data: dashboardData, isLoading, isError } = useQuery({
    queryKey: ['/api/admin/dashboard/stats'],
    staleTime: 120000, // 2 Minuten Cache, um die Server-Last zu reduzieren
    refetchOnWindowFocus: false, // Keine Aktualisierung bei Fokusänderung
    refetchOnMount: true, // Automatische Aktualisierung beim Mounten
    retry: 2, // Zwei Wiederholungsversuche
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponentielles Backoff mit Maximum 10 Sekunden
    queryFn: async () => {
      console.log("Fetching admin dashboard stats");
      try {
        // Verwende zuerst den sichereren direkten Endpunkt mit explizitem Accept-Header
        const response = await fetch('/api/admin/dashboard/stats-direct', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Force-API': 'true' // Spezieller Header, um Vite zu umgehen
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Fallback auf Standard-Endpunkt, falls der direkte nicht funktioniert
          console.log("Direct endpoint failed, falling back to standard endpoint");
          const fallbackResponse = await apiRequest('/api/admin/dashboard/stats');
          if (!fallbackResponse.ok) {
            throw new Error('Netzwerkfehler beim Laden der Daten');
          }
          return processStats(await fallbackResponse.json());
        }
        
        // Verarbeite die Antwort vom direkten Endpunkt
        const stats = await response.json();
        console.log("Dashboard stats loaded:", stats);
        return processStats(stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Bei Fehler: Leere Statistiken zurückgeben, um App funktionsfähig zu halten
        return {
          stats: {
            users: 0,
            orders: {
              total: 0, 
              pending: 0, 
              completed: 0,
              upcoming: 0
            },
            revenue: {
              total: 0,
              thisMonth: 0
            }
          }
        };
      }
    }
  });
  
  // Hilfsfunktion zum Verarbeiten der Statistikdaten
  function processStats(stats: any) {
    return {
      stats: {
        users: stats.totalUsers || 0,
        orders: {
          total: stats.totalOrders || 0,
          pending: stats.newOrders || 0,
          completed: (stats.totalOrders || 0) - (stats.newOrders || 0),
          upcoming: stats.upcomingDeliveries || 0
        },
        revenue: {
          // Wir haben aktuell keine Revenue-Daten, aber die Struktur ist vorbereitet
          total: 0, 
          thisMonth: 0
        }
      }
    };
  }
  
  // Neue Abfrage für aktuelle Bestellungen - mit direktem Endpunkt
  const { data: recentOrdersData, isLoading: isLoadingOrders, isError: isErrorOrders } = useQuery({
    queryKey: ['/api/admin/orders/recent'],
    staleTime: 60000, // 1 Minute Cache
    retry: 2,
    enabled: !isLoading, // Wird erst ausgeführt, wenn die Hauptstatistiken geladen wurden
    queryFn: async () => {
      console.log("Fetching recent orders");
      try {
        // Verwende zuerst den sichereren direkten Endpunkt
        const response = await fetch('/api/admin/orders/recent-direct', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Force-API': 'true' // Spezieller Header, um Vite zu umgehen
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Fallback auf Standard-Endpunkt, falls der direkte nicht funktioniert
          console.log("Direct endpoint failed, falling back to standard endpoint");
          const fallbackResponse = await apiRequest('/api/admin/orders/recent');
          if (!fallbackResponse.ok) {
            throw new Error('Fehler beim Laden der neuesten Bestellungen');
          }
          return fallbackResponse.json();
        }
        
        return response.json();
      } catch (error) {
        console.error("Error fetching recent orders:", error);
        return [];
      }
    }
  });
  
  // Abfrage für die neuesten Benutzer - mit direktem Endpunkt
  const { data: recentUsersData, isLoading: isLoadingUsers, isError: isErrorUsers } = useQuery({
    queryKey: ['/api/admin/users/recent'],
    staleTime: 60000, // 1 Minute Cache
    retry: 2,
    enabled: !isLoading, // Wird erst ausgeführt, wenn die Hauptstatistiken geladen wurden
    queryFn: async () => {
      console.log("Fetching recent users");
      try {
        // Verwende zuerst den sichereren direkten Endpunkt
        const response = await fetch('/api/admin/users/recent-direct', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Force-API': 'true' // Spezieller Header, um Vite zu umgehen
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Fallback auf Standard-Endpunkt, falls der direkte nicht funktioniert
          console.log("Direct endpoint failed, falling back to standard endpoint");
          const fallbackResponse = await apiRequest('/api/admin/users/recent');
          if (!fallbackResponse.ok) {
            throw new Error('Fehler beim Laden der neuesten Benutzer');
          }
          return fallbackResponse.json();
        }
        
        return response.json();
      } catch (error) {
        console.error("Error fetching recent users:", error);
        return [];
      }
    }
  });

  // Aktuelle Zeitperiode für die Anzeige
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('month');

  // Platzhalter für fehlende Daten
  const stats = dashboardData?.stats || {
    users: 0,
    orders: { total: 0, pending: 0, completed: 0 },
    revenue: { total: 0, thisMonth: 0 }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Übersicht</h2>
        <div className="flex space-x-2">
          <Button 
            variant={timePeriod === 'day' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimePeriod('day')}
          >
            Tag
          </Button>
          <Button 
            variant={timePeriod === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimePeriod('week')}
          >
            Woche
          </Button>
          <Button 
            variant={timePeriod === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimePeriod('month')}
          >
            Monat
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-7 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-500">Fehler beim Laden der Daten</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Es ist ein Fehler beim Laden der Dashboard-Daten aufgetreten. Bitte versuchen Sie es später erneut.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Seite neu laden
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Bestellungen Gesamt"
            value={stats.orders.total}
            description="Alle Bestellungen im System"
            icon={<IconShoppingCart className="w-5 h-5" />}
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Ausstehende Bestellungen"
            value={stats.orders.pending}
            description="Aktuell zu bearbeitende Bestellungen"
            icon={<IconTruck className="w-5 h-5" />}
            trend={{ value: 5, positive: false }}
          />
          <StatCard
            title="Registrierte Benutzer"
            value={stats.users}
            description="Aktive Nutzerkonten"
            icon={<IconUsers className="w-5 h-5" />}
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            title="Umsatz im Monat"
            value={`${stats.revenue.thisMonth.toFixed(2)} €`}
            description="Monatliche Einnahmen"
            icon={<IconChartBar className="w-5 h-5" />}
            trend={{ value: 15, positive: true }}
          />
        </div>
      )}

      <h3 className="text-xl font-bold mt-8">Aktuelle Aktivitäten</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Neue Bestellungen</CardTitle>
            <CardDescription>Die letzten 5 eingegangenen Bestellungen</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="animate-pulse flex justify-between p-2 border-b">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : isErrorOrders ? (
              <div className="p-2 text-red-500">
                Daten konnten nicht geladen werden
              </div>
            ) : recentOrdersData && recentOrdersData.length > 0 ? (
              <div className="space-y-2">
                {recentOrdersData.slice(0, 5).map((order: any) => {
                  // Berechne relative Zeit
                  const orderDate = new Date(order.createdAt);
                  const now = new Date();
                  const diffTime = Math.abs(now.getTime() - orderDate.getTime());
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  
                  let timeText = '';
                  if (diffDays === 0) {
                    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                    if (diffHours === 0) {
                      const diffMinutes = Math.floor(diffTime / (1000 * 60));
                      timeText = `Vor ${diffMinutes} Minuten`;
                    } else {
                      timeText = `Vor ${diffHours} Stunden`;
                    }
                  } else if (diffDays === 1) {
                    timeText = 'Gestern';
                  } else {
                    timeText = `Vor ${diffDays} Tagen`;
                  }
                  
                  return (
                    <div key={order.id} className="p-2 border-b flex justify-between">
                      <span className="font-medium">#{order.orderNumber}</span>
                      <span className="text-sm">{timeText}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 text-gray-500">
                Keine Bestellungen vorhanden
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => window.location.href = '/admin/orders'}
            >
              Alle Bestellungen anzeigen
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Neue Benutzer</CardTitle>
            <CardDescription>Die letzten 5 registrierten Benutzer</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="animate-pulse flex justify-between p-2 border-b">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : isErrorUsers ? (
              <div className="p-2 text-red-500">
                Daten konnten nicht geladen werden
              </div>
            ) : recentUsersData && recentUsersData.length > 0 ? (
              <div className="space-y-2">
                {recentUsersData.slice(0, 5).map((user: any) => {
                  // Berechne relative Zeit, falls createdAt vorhanden
                  let timeText = 'Kürzlich';
                  
                  if (user.createdAt) {
                    const userDate = new Date(user.createdAt);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - userDate.getTime());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) {
                      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                      if (diffHours === 0) {
                        const diffMinutes = Math.floor(diffTime / (1000 * 60));
                        timeText = `Vor ${diffMinutes} Minuten`;
                      } else {
                        timeText = `Vor ${diffHours} Stunden`;
                      }
                    } else if (diffDays === 1) {
                      timeText = 'Gestern';
                    } else if (diffDays < 7) {
                      timeText = `Vor ${diffDays} Tagen`;
                    } else {
                      timeText = 'Letzte Woche';
                    }
                  }
                  
                  return (
                    <div key={user.id} className="p-2 border-b flex justify-between">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm">{timeText}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 text-gray-500">
                Keine Benutzer vorhanden
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => window.location.href = '/admin/users'}
            >
              Alle Benutzer anzeigen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}