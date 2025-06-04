import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IconEdit, IconPrinter } from '@tabler/icons-react';

/**
 * Eigenschaften für OrderDetailsDialog-Komponente
 */
interface OrderDetailsDialogProps {
  /** Die ausgewählte Bestellung */
  order: any | null;
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Callback beim Schließen des Dialogs */
  onClose: () => void;
}

/**
 * Dialog zur Anzeige von detaillierten Bestellinformationen
 */
export function OrderDetailsDialog({ order, isOpen, onClose }: OrderDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Bestellungselemente laden
  const { data: orderItems = [], isLoading } = useQuery({
    queryKey: [`/api/admin/orders/${order?.id}/items`],
    queryFn: async () => {
      if (!order) return [];
      const response = await apiRequest(`/api/admin/orders/${order.id}/items`);
      return response.json();
    },
    enabled: !!order && isOpen,
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

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bestellung #{order.orderNumber}
            <Badge variant={getStatusVariant(order.status) as any}>
              {getStatusText(order.status)}
            </Badge>
            {order.deletedAt && (
              <Badge variant="destructive">Gelöscht</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Erstellt am {new Date(order.createdAt).toLocaleDateString()} um {new Date(order.createdAt).toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="items">Bestellpositionen</TabsTrigger>
            <TabsTrigger value="delivery">Lieferinformationen</TabsTrigger>
            <TabsTrigger value="history">Verlauf</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kundeninformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Name:</span> {order.customerName || 'Nicht angegeben'}
                  </div>
                  <div>
                    <span className="font-medium">E-Mail:</span> {order.customerEmail || 'Nicht angegeben'}
                  </div>
                  <div>
                    <span className="font-medium">Telefon:</span> {order.customerPhone || 'Nicht angegeben'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bestellungsinformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Status:</span> {getStatusText(order.status)}
                  </div>
                  <div>
                    <span className="font-medium">Bestelldatum:</span> {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Anzahl Artikel:</span> {orderItems.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                {order.notes ? (
                  <p className="whitespace-pre-wrap">{order.notes}</p>
                ) : (
                  <p className="text-gray-500">Keine Notizen vorhanden</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            {isLoading ? (
              <div className="text-center p-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary mx-auto mb-2"></div>
                <p>Bestellpositionen werden geladen...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artikel</TableHead>
                    <TableHead>Menge</TableHead>
                    <TableHead>Notizen</TableHead>
                    <TableHead>Store</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length > 0 ? (
                    orderItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                        <TableCell>{item.store || 'Beliebig'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Keine Artikel in dieser Bestellung
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="delivery">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lieferadresse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Name:</span> {order.addressName || order.customerName || 'Nicht angegeben'}
                  </div>
                  <div>
                    <span className="font-medium">Straße:</span> {order.addressStreet || 'Nicht angegeben'}
                  </div>
                  <div>
                    <span className="font-medium">PLZ/Ort:</span> {order.addressZip || 'Nicht angegeben'} {order.addressCity || ''}
                  </div>
                  <div>
                    <span className="font-medium">Land:</span> {order.addressCountry || 'Deutschland'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Liefertermin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Gewünschtes Datum:</span> {
                      order.desiredDeliveryDate 
                        ? new Date(order.desiredDeliveryDate).toLocaleDateString()
                        : 'Nicht angegeben'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Bevorzugte Zeit:</span> {
                      order.timeSlot 
                        ? order.timeSlot === 'morning' 
                          ? 'Vormittags (8-12 Uhr)' 
                          : order.timeSlot === 'afternoon' 
                            ? 'Nachmittags (12-16 Uhr)' 
                            : 'Abends (16-20 Uhr)'
                        : 'Nicht angegeben'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Besondere Anweisungen:</span> {order.deliveryInstructions || 'Keine'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <p className="text-center text-gray-500 py-4">
              Bestellhistorie wird in einem zukünftigen Update verfügbar sein.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button variant="outline">
            <IconPrinter className="mr-2 h-4 w-4" />
            Drucken
          </Button>
          <Button>
            <IconEdit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}