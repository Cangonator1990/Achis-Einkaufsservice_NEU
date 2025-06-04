import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OrderActionsMenu } from './OrderActionsMenu';

/**
 * Eigenschaften für die OrderTable-Komponente
 */
interface OrderTableProps {
  /** Liste der anzuzeigenden Bestellungen */
  orders: any[];
  /** Flag, ob die Daten noch geladen werden */
  isLoading: boolean;
  /** Callback zum Anzeigen der Bestellungsdetails */
  onShowDetails: (order: any) => void;
  /** Callback zum Bearbeiten einer Bestellung */
  onEdit: (order: any) => void;
  /** Callback zum Löschen einer Bestellung */
  onDelete: (orderId: number) => void;
  /** Callback zum Wiederherstellen einer gelöschten Bestellung */
  onRestore: (orderId: number) => void;
  /** Callback zum Ändern des Bestellstatus */
  onChangeStatus: (order: any) => void;
}

/**
 * Tabelle zur Anzeige von Bestellungsdaten
 */
export function OrderTable({ 
  orders, 
  isLoading, 
  onShowDetails, 
  onEdit, 
  onDelete, 
  onRestore,
  onChangeStatus
}: OrderTableProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse flex items-center space-x-4 p-4 border-b">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bestellnummer</TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Liefertermin</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">Keine Bestellungen gefunden</TableCell>
            </TableRow>
          ) : (
            orders.map((order: any) => (
              <TableRow key={order.id} className={order.deletedAt ? 'bg-red-50' : ''}>
                <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                <TableCell>
                  <div>
                    <div>{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                  </div>
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(order.status) as any}>
                    {getStatusText(order.status)}
                  </Badge>
                  {order.deletedAt && (
                    <Badge variant="destructive" className="ml-2">
                      Gelöscht
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {order.desiredDeliveryDate 
                    ? new Date(order.desiredDeliveryDate).toLocaleDateString() 
                    : 'Nicht angegeben'}
                </TableCell>
                <TableCell className="text-right">
                  <OrderActionsMenu 
                    order={order}
                    onShowDetails={() => onShowDetails(order)}
                    onEdit={() => onEdit(order)}
                    onDelete={() => onDelete(order.id)}
                    onRestore={() => onRestore(order.id)}
                    onChangeStatus={() => onChangeStatus(order)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}