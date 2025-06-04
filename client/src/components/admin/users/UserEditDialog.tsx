import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';
import { API_ADMIN } from '@/config/api.config';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { IconCheck, IconX } from '@tabler/icons-react';

/**
 * Props für den Benutzer-Bearbeitungsdialog
 */
interface UserEditDialogProps {
  /** Der zu bearbeitende Benutzer */
  user: any | null;
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Callback beim Schließen des Dialogs */
  onClose: () => void;
}

/**
 * Dialog zum Bearbeiten von Benutzerinformationen
 */
export function UserEditDialog({ user, isOpen, onClose }: UserEditDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phoneNumber: '',
    role: '',
    isActive: true
  });

  // Bei Änderung des Benutzers die Formulardaten aktualisieren
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || 'user',
        isActive: user.isActive !== false
      });
    }
  }, [user]);

  // Aktualisierung des Benutzers mit dem neuen ApiService
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) {
        throw new Error('Benutzer ID fehlt');
      }
      const endpoint = API_ADMIN.USERS.UPDATE(user.id);
      return await apiService.patch(endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzer aktualisiert',
        description: 'Die Benutzerinformationen wurden erfolgreich aktualisiert.',
      });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Die Benutzerinformationen konnten nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  });

  // Formular absenden
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    updateUserMutation.mutate(formData);
  };

  // Änderung der Formulardaten
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Informationen des Benutzers.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Telefonnummer</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Rolle</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Wählen Sie eine Rolle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Benutzer</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Benutzer aktiv</Label>
            <Switch 
              id="isActive" 
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              <IconX className="mr-2 h-4 w-4" />
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              <IconCheck className="mr-2 h-4 w-4" />
              {updateUserMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}