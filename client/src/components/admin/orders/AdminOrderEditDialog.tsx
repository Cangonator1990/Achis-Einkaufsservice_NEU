import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { IconCalendar, IconUser, IconShoppingCart } from '@tabler/icons-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  desiredDeliveryDate: string;
  desiredTimeSlot: string;
  suggestedDeliveryDate?: string;
  suggestedTimeSlot?: string;
  finalDeliveryDate?: string;
  finalTimeSlot?: string;
  additionalInstructions?: string;
  customer?: {
    name: string;
    email: string;
    phone?: string;
  };
}

interface AdminOrderEditDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: number, updates: any) => void;
}

export function AdminOrderEditDialog({ order, isOpen, onClose, onSave }: AdminOrderEditDialogProps) {
  const [status, setStatus] = useState('');
  const [suggestedDate, setSuggestedDate] = useState<Date | undefined>();
  const [suggestedTimeSlot, setSuggestedTimeSlot] = useState('');
  const [adminComment, setAdminComment] = useState('');

  // Reset form when order changes
  React.useEffect(() => {
    if (order) {
      setStatus(order.status);
      setSuggestedDate(order.suggestedDeliveryDate ? new Date(order.suggestedDeliveryDate) : undefined);
      setSuggestedTimeSlot(order.suggestedTimeSlot || '');
      setAdminComment('');
    }
  }, [order]);

  const handleSave = () => {
    if (!order) return;

    const updates: any = {
      status,
      adminComment
    };

    if (suggestedDate) {
      updates.suggestedDeliveryDate = suggestedDate.toISOString();
    }
    if (suggestedTimeSlot) {
      updates.suggestedTimeSlot = suggestedTimeSlot;
    }

    onSave(order.id, updates);
    onClose();
  };

  if (!order) return null;

  const statusOptions = [
    { value: 'new', label: 'Neu' },
    { value: 'processing', label: 'In Bearbeitung' },
    { value: 'confirmed', label: 'Bestätigt' },
    { value: 'shipped', label: 'Versendet' },
    { value: 'delivered', label: 'Geliefert' },
    { value: 'completed', label: 'Abgeschlossen' },
    { value: 'cancelled', label: 'Storniert' }
  ];

  const timeSlotOptions = [
    { value: 'morning', label: 'Vormittag (8-12 Uhr)' },
    { value: 'afternoon', label: 'Nachmittag (12-17 Uhr)' },
    { value: 'evening', label: 'Abend (17-20 Uhr)' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconShoppingCart className="h-5 w-5" />
            Bestellung {order.orderNumber} bearbeiten
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kundeninformationen */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <IconUser className="h-4 w-4" />
              Kundeninformationen
            </h3>
            {order.customer ? (
              <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {order.customer.name}</div>
                <div><strong>E-Mail:</strong> {order.customer.email}</div>
                {order.customer.phone && (
                  <div><strong>Telefon:</strong> {order.customer.phone}</div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Kunde unbekannt</p>
            )}
          </div>

          {/* Gewünschter Liefertermin */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Kundenwunsch</h3>
            <div className="text-sm space-y-1">
              <div><strong>Gewünschtes Datum:</strong> {format(new Date(order.desiredDeliveryDate), 'dd.MM.yyyy', { locale: de })}</div>
              <div><strong>Gewünschtes Zeitfenster:</strong> {timeSlotOptions.find(t => t.value === order.desiredTimeSlot)?.label}</div>
              {order.additionalInstructions && (
                <div><strong>Anweisungen:</strong> {order.additionalInstructions}</div>
              )}
            </div>
          </div>

          {/* Bestellstatus */}
          <div className="space-y-2">
            <Label htmlFor="status">Bestellstatus</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status auswählen" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Terminvorschlag durch Admin */}
          <div className="space-y-4">
            <h3 className="font-medium">Terminvorschlag machen</h3>
            
            <div className="space-y-2">
              <Label>Vorgeschlagenes Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <IconCalendar className="mr-2 h-4 w-4" />
                    {suggestedDate ? format(suggestedDate, 'dd.MM.yyyy', { locale: de }) : 'Datum auswählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={suggestedDate}
                    onSelect={setSuggestedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Vorgeschlagenes Zeitfenster</Label>
              <Select value={suggestedTimeSlot} onValueChange={setSuggestedTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Zeitfenster auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlotOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin-Kommentar */}
          <div className="space-y-2">
            <Label htmlFor="adminComment">Interne Notiz</Label>
            <Textarea
              id="adminComment"
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Interne Notizen zur Bestellung..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>
            Änderungen speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}