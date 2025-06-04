import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader } from '../common/AdminPageHeader';
import { AdminCard } from '../common/AdminCard';
import { AdminOrderTable } from './AdminOrderTable';
import { AdminOrderEditDialog } from './AdminOrderEditDialog';
import { AdminOrderDetailsDialog } from './AdminOrderDetailsDialog';
import { AdminDeliveryNegotiationDialog } from './AdminDeliveryNegotiationDialog';
import { IconShoppingCart } from '@tabler/icons-react';

/**
 * Vollständig neu aufgebaute Bestellungsverwaltung für das Admin-Portal
 */
export function NewOrderManagement() {
  const { toast } = useToast();
  
  // Zustandsvariablen
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);

  // Alle Bestellungen mit Kundendaten abrufen
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/admin/orders'],
    queryFn: async () => {
      try {
        console.log("Fetching admin orders from endpoint:", "/admin/orders");
        const response = await apiRequest('/admin/orders');
        return await response.json();
      } catch (error) {
        console.error("Error fetching admin orders:", error);
        throw new Error("Fehler beim Abrufen der Bestellungen");
      }
    }
  });

  // Bestellung bearbeiten (Status, Terminvorschlag, etc.)
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: number, updates: any }) => {
      await apiRequest(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/admin/orders'] });
      toast({
        title: 'Bestellung aktualisiert',
        description: 'Die Bestellung wurde erfolgreich aktualisiert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Die Bestellung konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  });

  // Bestellung sperren/entsperren
  const lockOrderMutation = useMutation({
    mutationFn: async ({ orderId, isLocked }: { orderId: number, isLocked: boolean }) => {
      await apiRequest(`/api/admin/orders/${orderId}/lock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isLocked }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/admin/orders'] });
      toast({
        title: 'Bestellung gesperrt/entsperrt',
        description: 'Der Sperrstatus wurde erfolgreich geändert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Sperrstatus konnte nicht geändert werden.',
        variant: 'destructive',
      });
    }
  });

  // Event Handler
  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleSaveOrder = (orderId: number, updates: any) => {
    updateOrderMutation.mutate({ orderId, updates });
  };

  const handleLockOrder = (orderId: number) => {
    lockOrderMutation.mutate({ orderId, isLocked: true });
  };

  const handleUnlockOrder = (orderId: number) => {
    lockOrderMutation.mutate({ orderId, isLocked: false });
  };

  const handleScheduleDelivery = (order: any) => {
    // Öffne Dialog zur Terminverhandlung
    setSelectedOrder(order);
    setIsDeliveryDialogOpen(true);
  };

  const handleDeleteOrder = (orderId: number) => {
    // TODO: Implementiere Löschfunktion
    console.log('Delete order:', orderId);
    toast({
      title: 'Funktion in Entwicklung',
      description: 'Die Löschfunktion wird in Kürze verfügbar sein.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bestellungsverwaltung"
        description="Verwalten Sie alle eingegangenen Bestellungen"
      />

      <AdminCard title="Bestellungsübersicht">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Alle Bestellungen ({orders.length})</h2>
          </div>

          <AdminOrderTable
            orders={orders}
            onViewDetails={handleViewDetails}
            onEditOrder={handleEditOrder}
            onLockOrder={handleLockOrder}
            onUnlockOrder={handleUnlockOrder}
            onScheduleDelivery={handleScheduleDelivery}
            onDeleteOrder={handleDeleteOrder}
          />
        </div>
      </AdminCard>

      {/* Bearbeitungs-Dialog */}
      <AdminOrderEditDialog
        order={selectedOrder}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedOrder(null);
        }}
        onSave={handleSaveOrder}
      />

      {/* Details-Dialog */}
      <AdminOrderDetailsDialog
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* Liefertermin-Verhandlungs-Dialog */}
      <AdminDeliveryNegotiationDialog
        order={selectedOrder}
        isOpen={isDeliveryDialogOpen}
        onClose={() => {
          setIsDeliveryDialogOpen(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}