import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Nur die nötigsten Icons importieren
import { IconRotateClockwise, IconAlertTriangle } from '@tabler/icons-react';

// Minimale Typdefinitionen
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
  deletedAt?: string | null;
}

export function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeletedOrders, setShowDeletedOrders] = useState(false);

  // Den zentralen useAuth-Hook verwenden, der bereits die vollständige Auth-Logik enthält
  const { user, isLoading: userLoading, isAdmin } = useAuth();
  
  // Debug-Ausgabe hinzufügen
  console.log("Admin Dashboard Auth Status:", { 
    user, 
    userLoading, 
    isAdmin,
    authenticated: !!user 
  });

  // Einfache Query für Bestellungen
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErrorMessage
  } = useQuery({
    queryKey: ["/api/admin/orders", { includeDeleted: showDeletedOrders }],
    queryFn: async ({ queryKey }) => {
      try {
        const [_, params] = queryKey as [string, { includeDeleted: boolean }];
        const endpoint = params.includeDeleted ? '/api/admin/orders/all' : '/api/admin/orders';
        
        console.log("Fetching admin orders from endpoint:", endpoint);
        
        const response = await apiRequest(endpoint);
        return await response.json();
      } catch (error) {
        console.error("Error fetching admin orders:", error);
        if (error instanceof Error) {
          if (error.message.includes("403")) {
            throw new Error("Sie haben keine Berechtigung, diese Daten anzuzeigen.");
          }
          throw error;
        }
        throw new Error("Unbekannter Fehler beim Abrufen der Bestellungen");
      }
    },
    enabled: !!isAdmin,
    retry: 1
  });

  // Mutation zum Wiederherstellen gelöschter Bestellungen
  const restoreOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      console.log("Restoring order with ID:", orderId);
      // Der richtige Endpunkt wie in der Server-API definiert
      const response = await apiRequest(`/api/admin/orders/${orderId}/restore`, {
        method: "POST"
      });
      return response;
    },
    onSuccess: (data: any) => {
      console.log("Order restore success:", data);
      // Beide Endpunkte im Cache invalidieren, um sicherzustellen, dass die Daten aktualisiert werden
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/all"] });
      
      toast({
        title: "Bestellung wiederhergestellt",
        description: data?.message || "Die Bestellung wurde erfolgreich wiederhergestellt.",
      });
    },
    onError: (error: Error) => {
      console.error("Order restore error:", error);
      toast({
        title: "Fehler",
        description: `Die Bestellung konnte nicht wiederhergestellt werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleRestoreOrder = (order: Order) => {
    restoreOrderMutation.mutate(order.id);
  };

  // Zeige Ladeindikator während der Benutzer geladen wird
  if (userLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p>Benutzerinformationen werden geladen...</p>
      </div>
    );
  }

  // Zeige Fehler, wenn kein Admin-Zugriff
  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <Alert variant="destructive" className="mb-4">
          <IconAlertTriangle className="h-5 w-5 mr-2" />
          <AlertTitle>Zugriff verweigert</AlertTitle>
          <AlertDescription>
            Sie benötigen Administrator-Rechte, um auf dieses Dashboard zuzugreifen.
            Bitte melden Sie sich mit einem Administrator-Konto an.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bestellungen</CardTitle>
          <CardDescription>Verwaltung aller Bestellungen im System</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="show-deleted"
              checked={showDeletedOrders}
              onCheckedChange={(checked) => setShowDeletedOrders(!!checked)}
            />
            <Label htmlFor="show-deleted" className="cursor-pointer">
              Gelöschte Bestellungen einbeziehen
            </Label>
          </div>

          {ordersError && (
            <Alert variant="destructive" className="mb-4">
              <IconAlertTriangle className="h-5 w-5 mr-2" />
              <AlertTitle>Fehler beim Laden der Bestellungen</AlertTitle>
              <AlertDescription>
                {ordersErrorMessage instanceof Error ? ordersErrorMessage.message : "Unbekannter Fehler"}
              </AlertDescription>
            </Alert>
          )}
          
          {ordersLoading ? (
            <div>Bestellungen werden geladen...</div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(orders) && orders.length > 0 ? (
                orders.map((order: Order) => (
                  <Card key={order.id} className={`${order.deletedAt ? 'border-red-300 bg-red-50' : ''}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Bestellung {order.orderNumber}</CardTitle>
                      <CardDescription>Status: {order.status}</CardDescription>
                    </CardHeader>
                    
                    {order.deletedAt && (
                      <CardContent className="pb-2">
                        <Badge variant="destructive">
                          Gelöscht am {new Date(order.deletedAt).toLocaleDateString()}
                        </Badge>
                      </CardContent>
                    )}
                    
                    <CardFooter>
                      {order.deletedAt && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleRestoreOrder(order)}
                        >
                          <IconRotateClockwise className="h-4 w-4 mr-2" /> Wiederherstellen
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center text-gray-500">Keine Bestellungen gefunden</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-gray-500 text-sm">
        <p>Hinweis: Dies ist eine vereinfachte Version des Dashboards. Weitere Funktionen werden schrittweise hinzugefügt.</p>
      </div>
    </div>
  );
}