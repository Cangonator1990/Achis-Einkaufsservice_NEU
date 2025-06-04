import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/**
 * Eigenschaften für StatusChangeDialog-Komponente
 */
interface StatusChangeDialogProps {
  /** Die ausgewählte Bestellung */
  order: any | null;
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Callback beim Schließen des Dialogs */
  onClose: () => void;
  /** Callback beim Speichern der Änderungen */
  onSave: (orderId: number, newStatus: string, comment: string) => void;
}

/**
 * Dialog zur Änderung des Bestellungsstatus
 */
export function StatusChangeDialog({ order, isOpen, onClose, onSave }: StatusChangeDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [comment, setComment] = useState('');

  // Zurücksetzen des Formulars, wenn sich die Bestellung ändert oder der Dialog geschlossen wird
  const resetForm = () => {
    setSelectedStatus(order?.status || '');
    setComment('');
  };

  // Form zurücksetzen wenn eine neue Bestellung ausgewählt wird
  if (order && selectedStatus === '' && isOpen) {
    setSelectedStatus(order.status);
  }

  const handleSave = () => {
    if (!order) return;
    onSave(order.id, selectedStatus, comment);
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!order) return null;

  // Status-Optionen für die Bestellung
  const statusOptions = [
    { value: 'new', label: 'Neu' },
    { value: 'processing', label: 'In Bearbeitung' },
    { value: 'confirmed', label: 'Bestätigt' },
    { value: 'shipped', label: 'Versendet' },
    { value: 'delivered', label: 'Geliefert' },
    { value: 'completed', label: 'Abgeschlossen' },
    { value: 'cancelled', label: 'Storniert' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Status ändern - Bestellung #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            Ändern Sie den Status der Bestellung und fügen Sie optional einen Kommentar hinzu.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Neuer Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status wählen" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Geben Sie einen Kommentar zur Statusänderung ein"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!selectedStatus || selectedStatus === order.status}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}