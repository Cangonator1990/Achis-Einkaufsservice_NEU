import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconUser, IconMapPin, IconShoppingBag, IconCalendar, IconClock, IconNote } from '@tabler/icons-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
  desiredDeliveryDate: string;
  desiredTimeSlot: string;
  suggestedDeliveryDate?: string;
  suggestedTimeSlot?: string;
  finalDeliveryDate?: string;
  finalTimeSlot?: string;
  additionalInstructions?: string;
  store: string;
  isLocked?: boolean;
  cancelledAt?: string;
  items?: Array<{
    id: number;
    productName: string;
    quantity: string;
    store: string;
    notes?: string;
    imageUrl?: string;
  }>;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  address?: {
    fullName: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    additionalInfo?: string;
  };
}

interface AdminOrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminOrderDetailsDialog({ order, isOpen, onClose }: AdminOrderDetailsDialogProps) {
  if (!order) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'new': { label: 'Neu', variant: 'default' as const },
      'processing': { label: 'In Bearbeitung', variant: 'secondary' as const },
      'pending_admin_review': { label: 'Warten auf Admin', variant: 'outline' as const },
      'pending_customer_review': { label: 'Warten auf Kunde', variant: 'outline' as const },
      'date_forced': { label: 'Termin festgelegt', variant: 'destructive' as const },
      'date_accepted': { label: 'Termin akzeptiert', variant: 'default' as const },
      'confirmed': { label: 'Bestätigt', variant: 'outline' as const },
      'shipped': { label: 'Versendet', variant: 'secondary' as const },
      'delivered': { label: 'Geliefert', variant: 'default' as const },
      'completed': { label: 'Abgeschlossen', variant: 'outline' as const },
      'cancelled': { label: 'Storniert', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
  };

  const formatTimeSlot = (slot: string) => {
    const slots = {
      'morning': 'Vormittag (8-12 Uhr)',
      'afternoon': 'Nachmittag (12-17 Uhr)',
      'evening': 'Abend (17-20 Uhr)'
    };
    return slots[slot as keyof typeof slots] || slot;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Bestellungsdetails - {order.orderNumber}</span>
            {getStatusBadge(order.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Linke Spalte */}
          <div className="space-y-4">
            {/* Kundeninformationen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconUser className="h-5 w-5" />
                  Kundeninformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.customer ? (
                  <>
                    <div><strong>Name:</strong> {order.customer.name}</div>
                    <div><strong>E-Mail:</strong> {order.customer.email}</div>
                    {order.customer.phone && (
                      <div><strong>Telefon:</strong> {order.customer.phone}</div>
                    )}
                    <div><strong>Kunden-ID:</strong> {order.customer.id}</div>
                  </>
                ) : (
                  <p className="text-gray-500">Kunde unbekannt</p>
                )}
              </CardContent>
            </Card>

            {/* Lieferadresse */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconMapPin className="h-5 w-5" />
                  Lieferadresse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.address ? (
                  <>
                    <div><strong>Name:</strong> {order.address.fullName}</div>
                    <div><strong>Adresse:</strong> {order.address.street} {order.address.houseNumber}</div>
                    <div><strong>PLZ/Ort:</strong> {order.address.postalCode} {order.address.city}</div>
                    {order.address.additionalInfo && (
                      <div><strong>Zusatzinfo:</strong> {order.address.additionalInfo}</div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">Keine Adresse hinterlegt</p>
                )}
              </CardContent>
            </Card>

            {/* Bestellinformationen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconShoppingBag className="h-5 w-5" />
                  Bestellinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Bestellnummer:</strong> {order.orderNumber}</div>
                <div><strong>Erstellt am:</strong> {formatDate(order.createdAt)}</div>
                <div><strong>Store:</strong> {order.store || 'Nicht angegeben'}</div>
                <div><strong>Gesperrt:</strong> {order.isLocked ? 'Ja' : 'Nein'}</div>
                {order.cancelledAt && (
                  <div><strong>Storniert am:</strong> {formatDate(order.cancelledAt)}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-4">
            {/* Liefertermine */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconCalendar className="h-5 w-5" />
                  Liefertermine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Kundenwunsch */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Kundenwunsch</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Datum:</strong> {formatDate(order.desiredDeliveryDate)}</div>
                    <div><strong>Zeitfenster:</strong> {formatTimeSlot(order.desiredTimeSlot)}</div>
                  </div>
                </div>

                {/* Admin-Vorschlag */}
                {order.suggestedDeliveryDate && (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Admin-Vorschlag</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Datum:</strong> {formatDate(order.suggestedDeliveryDate)}</div>
                      <div><strong>Zeitfenster:</strong> {formatTimeSlot(order.suggestedTimeSlot || '')}</div>
                    </div>
                  </div>
                )}

                {/* Finaler Termin */}
                {order.finalDeliveryDate && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Bestätigter Termin</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Datum:</strong> {formatDate(order.finalDeliveryDate)}</div>
                      <div><strong>Zeitfenster:</strong> {formatTimeSlot(order.finalTimeSlot || '')}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Zusätzliche Anweisungen */}
            {order.additionalInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <IconNote className="h-5 w-5" />
                    Lieferanweisungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.additionalInstructions}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bestellpositionen */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconShoppingBag className="h-5 w-5" />
              Bestellpositionen ({order.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.productName}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Menge:</strong> {item.quantity}</div>
                        <div><strong>Store:</strong> {item.store}</div>
                        {item.notes && (
                          <div><strong>Notizen:</strong> {item.notes}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Keine Bestellpositionen gefunden</p>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}