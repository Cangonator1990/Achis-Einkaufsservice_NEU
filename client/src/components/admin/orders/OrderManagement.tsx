import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader } from '../common/AdminPageHeader';
import { AdminCard } from '../common/AdminCard';
import { AdminOrderTable } from './AdminOrderTable';
import { AdminOrderEditDialog } from './AdminOrderEditDialog';
import { IconShoppingCart } from '@tabler/icons-react';

/**
 * Hauptkomponente für die Bestellungsverwaltung
 */
export function OrderManagement() {
  const { toast } = useToast();
  
  // Zustandsvariablen
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Alle Bestellungen abrufen
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

  // Bestellung wiederherstellen
  const restoreOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest(`/api/admin/orders/${orderId}/restore`, {
        method: "POST"
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Bestellung wiederhergestellt",
        description: "Die Bestellung wurde erfolgreich wiederhergestellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Die Bestellung konnte nicht wiederhergestellt werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bestellung löschen
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest(`/api/admin/orders/${orderId}`, {
        method: "DELETE"
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Bestellung gelöscht",
        description: "Die Bestellung wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Die Bestellung konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Status einer Bestellung ändern
  const changeOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, comment }: { orderId: number, status: string, comment?: string }) => {
      const response = await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, comment }),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Status geändert",
        description: "Der Bestellstatus wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Der Status konnte nicht geändert werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handler-Funktionen
  const showOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const openStatusDialog = (order: any) => {
    setSelectedOrder(order);
    setIsStatusDialogOpen(true);
  };

  const handleRestoreOrder = (orderId: number) => {
    restoreOrderMutation.mutate(orderId);
  };

  const handleDeleteOrder = (orderId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Bestellung löschen möchten?')) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  const handleStatusChange = (orderId: number, newStatus: string, comment: string) => {
    changeOrderStatusMutation.mutate({ orderId, status: newStatus, comment });
  };

  // Bestellungen filtern
  const filteredOrders = orders.filter((order: any) => {
    // Suche
    const searchMatches = searchQuery === '' ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customerEmail && order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tab-Filter
    if (currentTab === 'all') return searchMatches && !order.deletedAt;
    if (currentTab === 'deleted') return searchMatches && order.deletedAt;
    if (currentTab === 'new') return searchMatches && order.status === 'new' && !order.deletedAt;
    if (currentTab === 'processing') return searchMatches && order.status === 'processing' && !order.deletedAt;
    if (currentTab === 'completed') return searchMatches && ['completed', 'delivered'].includes(order.status) && !order.deletedAt;

    return searchMatches && !order.deletedAt;
  });

  // Paginierung anwenden
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Bestellungsverwaltung" 
        actionButton={{
          label: "Neue Bestellung erstellen",
          icon: <IconShoppingCart className="h-5 w-5" />,
          onClick: () => window.location.href = '/order'
        }}
      />

      <AdminCard
        title="Bestellliste"
        description="Verwalten Sie alle Bestellungen im System."
        footer={
          <UserPagination 
            totalItems={filteredOrders.length} 
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        }
      >
        <div className="space-y-4">
          <OrderFilter 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={currentTab}
            onTabChange={setCurrentTab}
          />

          <OrderTable 
            orders={paginatedOrders}
            isLoading={isLoading}
            onShowDetails={showOrderDetails}
            onEdit={(order) => alert(`Bestellung #${order.orderNumber} bearbeiten`)}
            onDelete={handleDeleteOrder}
            onRestore={handleRestoreOrder}
            onChangeStatus={openStatusDialog}
          />
        </div>
      </AdminCard>

      {/* Bestelldetails Dialog */}
      <OrderDetailsDialog 
        order={selectedOrder} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />

      {/* Status ändern Dialog */}
      <StatusChangeDialog 
        order={selectedOrder}
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onSave={handleStatusChange}
      />
    </div>
  );
}