import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { IconChevronRight, IconEye } from '@tabler/icons-react';

/**
 * Karte für die Anzeige der neuesten Bestellungen im Dashboard
 */
export function RecentOrdersCard() {
  // Lade neueste Bestellungen
  const { data: recentOrders = [], isLoading } = useQuery({
    queryKey: ['/api/admin/orders/recent'],
    queryFn: async () => {
      console.log("Fetching recent orders");
      try {
        const response = await apiRequest('/api/admin/orders/recent-direct');
        return response.json();
      } catch (error) {
        console.error("Error fetching recent orders:", error);
        return [];
      }
    }
  });

  // Hilfsfunktion zur Übersetzung des Status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Neu';
      case 'processing': return 'In Bearbeitung';
      case 'confirmed': return 'Bestätigt';
      case 'shipped': return 'Versendet';
      case 'delivered': return 'Geliefert';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  // Hilfsfunktion zur Bestimmung der Status-Variante
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'processing': return 'secondary';
      case 'confirmed': return 'secondary';
      case 'shipped': return 'success';
      case 'delivered': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neueste Bestellungen</CardTitle>
        <CardDescription>Die letzten 5 eingegangenen Bestellungen</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="animate-pulse flex items-center justify-between p-2 border-b">
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            ))
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              Keine Bestellungen vorhanden
            </div>
          ) : (
            recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-2 border-b last:border-0">
                <div className="space-y-1">
                  <div className="font-medium">#{order.orderNumber}</div>
                  <div className="text-sm text-gray-500">
                    {order.customerName || 'Unbekannter Kunde'} • {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(order.status) as any}>
                    {getStatusText(order.status)}
                  </Badge>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Button variant="ghost" size="icon">
                      <IconEye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link href="/admin/orders">
          <Button variant="ghost" className="text-sm">
            Alle Bestellungen anzeigen
            <IconChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}