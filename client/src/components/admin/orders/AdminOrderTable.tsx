import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconDots, IconEye, IconEdit, IconLock, IconLockOpen, IconCalendar, IconTrash } from '@tabler/icons-react';

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
  desiredDeliveryDate: string;
  desiredTimeSlot: string;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  isLocked?: boolean;
}

interface AdminOrderTableProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onLockOrder: (orderId: number) => void;
  onUnlockOrder: (orderId: number) => void;
  onScheduleDelivery: (order: Order) => void;
  onDeleteOrder: (orderId: number) => void;
}

export function AdminOrderTable({ 
  orders, 
  onViewDetails, 
  onEditOrder, 
  onLockOrder, 
  onUnlockOrder,
  onScheduleDelivery,
  onDeleteOrder
}: AdminOrderTableProps) {
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'new': { label: 'Neu', variant: 'default' as const },
      'processing': { label: 'In Bearbeitung', variant: 'secondary' as const },
      'confirmed': { label: 'Bestätigt', variant: 'outline' as const },
      'shipped': { label: 'Versendet', variant: 'secondary' as const },
      'delivered': { label: 'Geliefert', variant: 'default' as const },
      'completed': { label: 'Abgeschlossen', variant: 'outline' as const },
      'cancelled': { label: 'Storniert', variant: 'destructive' as const },
      'locked': { label: 'Gesperrt', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTimeSlot = (slot: string) => {
    const slots = {
      'morning': 'Vormittag (8-12 Uhr)',
      'afternoon': 'Nachmittag (12-17 Uhr)',
      'evening': 'Abend (17-20 Uhr)'
    };
    return slots[slot as keyof typeof slots] || slot;
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Keine Bestellungen gefunden.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bestellnummer</TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Erstellt am</TableHead>
            <TableHead>Gewünschter Liefertermin</TableHead>
            <TableHead>Zeitfenster</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.orderNumber}
                {order.isLocked && (
                  <IconLock className="inline ml-2 h-4 w-4 text-red-500" />
                )}
              </TableCell>
              <TableCell>
                {order.customer ? (
                  <div>
                    <div className="font-medium">{order.customer.name}</div>
                    <div className="text-sm text-gray-500">{order.customer.email}</div>
                    {order.customer.phone && (
                      <div className="text-sm text-gray-500">{order.customer.phone}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">Kunde unbekannt</span>
                )}
              </TableCell>
              <TableCell>
                {getStatusBadge(order.status)}
              </TableCell>
              <TableCell>
                {formatDate(order.createdAt)}
              </TableCell>
              <TableCell>
                {formatDate(order.desiredDeliveryDate)}
              </TableCell>
              <TableCell>
                {formatTimeSlot(order.desiredTimeSlot)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Aktionen öffnen</span>
                      <IconDots className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(order)}>
                      <IconEye className="mr-2 h-4 w-4" />
                      Details anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditOrder(order)}>
                      <IconEdit className="mr-2 h-4 w-4" />
                      Bestellung bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onScheduleDelivery(order)}>
                      <IconCalendar className="mr-2 h-4 w-4" />
                      Liefertermin verhandeln
                    </DropdownMenuItem>
                    {order.isLocked ? (
                      <DropdownMenuItem onClick={() => onUnlockOrder(order.id)}>
                        <IconLockOpen className="mr-2 h-4 w-4" />
                        Entsperren
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onLockOrder(order.id)}>
                        <IconLock className="mr-2 h-4 w-4" />
                        Sperren
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDeleteOrder(order.id)}
                      className="text-red-600"
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}