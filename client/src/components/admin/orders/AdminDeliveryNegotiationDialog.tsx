import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { IconCalendar, IconClock, IconLock, IconSend } from '@tabler/icons-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  isLocked?: boolean;
  customer?: {
    name: string;
    email: string;
  };
}

interface AdminDeliveryNegotiationDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDeliveryNegotiationDialog({ order, isOpen, onClose }: AdminDeliveryNegotiationDialogProps) {
  const [suggestedDate, setSuggestedDate] = useState<Date | undefined>();
  const [suggestedTimeSlot, setSuggestedTimeSlot] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [actionType, setActionType] = useState<'suggest' | 'force'>('suggest');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when order changes
  React.useEffect(() => {
    if (order) {
      setSuggestedDate(undefined);
      setSuggestedTimeSlot('');
      setAdminComment('');
      setActionType('suggest');
    }
  }, [order]);

  const suggestDateMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: any }) => {
      return apiRequest(`/api/admin/orders/${orderId}/suggest-date`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Terminvorschlag gesendet',
        description: 'Der Kunde wurde über den neuen Terminvorschlag benachrichtigt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/admin/orders'] });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Terminvorschlag konnte nicht gesendet werden.',
        variant: 'destructive',
      });
    }
  });

  const forceDateMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: any }) => {
      return apiRequest(`/api/admin/orders/${orderId}/force-date`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Termin festgelegt',
        description: 'Der Liefertermin wurde verbindlich festgelegt und die Bestellung gesperrt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/admin/orders'] });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Termin konnte nicht festgelegt werden.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = () => {
    if (!order || !suggestedDate || !suggestedTimeSlot) {
      toast({
        title: 'Fehlende Angaben',
        description: 'Bitte wählen Sie Datum und Zeitfenster aus.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      [actionType === 'suggest' ? 'suggestedDate' : 'finalDeliveryDate']: suggestedDate.toISOString(),
      [actionType === 'suggest' ? 'suggestedTimeSlot' : 'finalTimeSlot']: suggestedTimeSlot,
      adminComment
    };

    if (actionType === 'suggest') {
      suggestDateMutation.mutate({ orderId: order.id, data });
    } else {
      forceDateMutation.mutate({ orderId: order.id, data });
    }
  };

  if (!order) return null;

  const timeSlotOptions = [
    { value: 'morning', label: 'Vormittag (8-12 Uhr)' },
    { value: 'afternoon', label: 'Nachmittag (12-17 Uhr)' },
    { value: 'evening', label: 'Abend (17-20 Uhr)' }
  ];

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

  const isPending = suggestDateMutation.isPending || forceDateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCalendar className="h-5 w-5" />
            Liefertermin verhandeln - {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aktuelle Terminübersicht */}
          <div className="space-y-4">
            <h3 className="font-medium">Aktuelle Termine</h3>
            
            {/* Kundenwunsch */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <IconClock className="h-4 w-4" />
                Kundenwunsch
              </h4>
              <div className="text-sm space-y-1">
                <div><strong>Datum:</strong> {formatDate(order.desiredDeliveryDate)}</div>
                <div><strong>Zeitfenster:</strong> {formatTimeSlot(order.desiredTimeSlot)}</div>
              </div>
            </div>

            {/* Bisheriger Admin-Vorschlag */}
            {order.suggestedDeliveryDate && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Bisheriger Admin-Vorschlag</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Datum:</strong> {formatDate(order.suggestedDeliveryDate)}</div>
                  <div><strong>Zeitfenster:</strong> {formatTimeSlot(order.suggestedTimeSlot || '')}</div>
                </div>
              </div>
            )}

            {/* Finaler Termin */}
            {order.finalDeliveryDate && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  <IconLock className="h-4 w-4" />
                  Bestätigter Termin (gesperrt)
                </h4>
                <div className="text-sm space-y-1">
                  <div><strong>Datum:</strong> {formatDate(order.finalDeliveryDate)}</div>
                  <div><strong>Zeitfenster:</strong> {formatTimeSlot(order.finalTimeSlot || '')}</div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Neuen Termin setzen */}
          <div className="space-y-4">
            <h3 className="font-medium">Neuen Termin setzen</h3>

            {/* Aktionstyp auswählen */}
            <div className="space-y-3">
              <Label>Aktion</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="actionType"
                    value="suggest"
                    checked={actionType === 'suggest'}
                    onChange={(e) => setActionType(e.target.value as 'suggest' | 'force')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    <strong>Terminvorschlag senden</strong> - Kunde kann akzeptieren oder Gegenvorschlag machen
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="actionType"
                    value="force"
                    checked={actionType === 'force'}
                    onChange={(e) => setActionType(e.target.value as 'suggest' | 'force')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    <strong>Termin verbindlich festlegen</strong> - Bestellung wird gesperrt, keine weiteren Änderungen möglich
                  </span>
                </label>
              </div>
            </div>

            {/* Datum auswählen */}
            <div className="space-y-2">
              <Label>Datum</Label>
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

            {/* Zeitfenster auswählen */}
            <div className="space-y-2">
              <Label>Zeitfenster</Label>
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

            {/* Admin-Kommentar */}
            <div className="space-y-2">
              <Label htmlFor="adminComment">
                {actionType === 'suggest' ? 'Nachricht an Kunde (optional)' : 'Begründung für verbindliche Festlegung'}
              </Label>
              <Textarea
                id="adminComment"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder={
                  actionType === 'suggest' 
                    ? "Begründung oder zusätzliche Informationen für den Kunden..."
                    : "Warum wird dieser Termin verbindlich festgelegt?"
                }
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                {actionType === 'suggest' ? 'Sende Vorschlag...' : 'Lege Termin fest...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {actionType === 'suggest' ? <IconSend className="h-4 w-4" /> : <IconLock className="h-4 w-4" />}
                {actionType === 'suggest' ? 'Vorschlag senden' : 'Termin festlegen'}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}