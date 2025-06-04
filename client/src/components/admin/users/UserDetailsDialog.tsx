import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Eigenschaften für UserDetailsDialog-Komponente
 */
interface UserDetailsDialogProps {
  /** Der ausgewählte Benutzer */
  user: any | null;
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Callback beim Schließen des Dialogs */
  onClose: () => void;
}

/**
 * Dialog zur Anzeige von detaillierten Benutzerinformationen
 */
export function UserDetailsDialog({ user, isOpen, onClose }: UserDetailsDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user.firstName} {user.lastName}
            <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
              {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
            </Badge>
            <Badge variant={user.isActive ? 'default' : 'destructive'}>
              {user.isActive ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Registriert seit {new Date(user.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="mb-4">
            <TabsTrigger value="info">Persönliche Daten</TabsTrigger>
            <TabsTrigger value="orders">Bestellungen</TabsTrigger>
            <TabsTrigger value="addresses">Adressen</TabsTrigger>
            <TabsTrigger value="activity">Aktivität</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kontaktinformationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Benutzername:</span> {user.username}
                  </div>
                  <div>
                    <span className="font-medium">E-Mail:</span> {user.email}
                  </div>
                  <div>
                    <span className="font-medium">Telefon:</span> {user.phoneNumber || 'Nicht angegeben'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Persönliche Informationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">Vorname:</span> {user.firstName}
                  </div>
                  <div>
                    <span className="font-medium">Nachname:</span> {user.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Geburtsdatum:</span> {user.birthDate ? new Date(user.birthDate).toLocaleDateString() : 'Nicht angegeben'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kontostatus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Status:</span> {user.isActive ? 'Aktiv' : 'Inaktiv'}
                </div>
                <div>
                  <span className="font-medium">Rolle:</span> {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </div>
                <div>
                  <span className="font-medium">Erstellt am:</span> {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Letzte Aktualisierung:</span> {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Unbekannt'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bestellungsverlauf</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-4">
                  Bestellungsverlauf wird in einem zukünftigen Update verfügbar sein.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gespeicherte Adressen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-4">
                  Adressverwaltung wird in einem zukünftigen Update verfügbar sein.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Benutzeraktivität</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-4">
                  Aktivitätsverlauf wird in einem zukünftigen Update verfügbar sein.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}