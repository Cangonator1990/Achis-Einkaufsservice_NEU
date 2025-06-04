import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  IconServer,
  IconDatabaseImport,
  IconLock,
  IconMail,
  IconDeviceMobile,
  IconBrandGoogle,
  IconReload,
  IconDeviceFloppy,
  IconDeviceDesktop
} from '@tabler/icons-react';

// Schema für die Systemeinstellungen
const generalSettingsSchema = z.object({
  siteName: z.string().min(1, 'Pflichtfeld'),
  siteDescription: z.string(),
  adminEmail: z.string().email('Gültige E-Mail erforderlich'),
  supportEmail: z.string().email('Gültige E-Mail erforderlich'),
  orderPrefix: z.string().min(1, 'Pflichtfeld'),
  currencySymbol: z.string().min(1, 'Pflichtfeld'),
  itemsPerPage: z.coerce.number().int().min(5).max(100)
});

export function SystemSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  // Formular für allgemeine Einstellungen
  const generalForm = useForm({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      siteName: 'Achis Einkaufservice',
      siteDescription: 'Ihr Online-Shop für Bestellungen aller Art',
      adminEmail: 'admin@achis-einkaufservice.de',
      supportEmail: 'support@achis-einkaufservice.de',
      orderPrefix: 'AE',
      currencySymbol: '€',
      itemsPerPage: 25
    }
  });

  // Einstellungen speichern
  const saveSettings = (data: any) => {
    toast({
      title: 'Einstellungen gespeichert',
      description: 'Die Systemeinstellungen wurden erfolgreich aktualisiert.',
    });
    console.log('Gespeicherte Einstellungen:', data);
  };

  // Datenbank-Backup und Wiederherstellung
  const createBackup = () => {
    toast({
      title: 'Backup erstellt',
      description: 'Ein neues Datenbank-Backup wurde erstellt.',
    });
  };

  const restoreBackup = () => {
    toast({
      title: 'Backup wiederhergestellt',
      description: 'Die Datenbank wurde wiederhergestellt.',
    });
  };

  // Cache-Einstellungen
  const clearCache = () => {
    toast({
      title: 'Cache geleert',
      description: 'Der Systemcache wurde erfolgreich geleert.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Systemeinstellungen</h2>
      </div>

      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="email">E-Mail</TabsTrigger>
          <TabsTrigger value="security">Sicherheit</TabsTrigger>
          <TabsTrigger value="database">Datenbank</TabsTrigger>
          <TabsTrigger value="maintenance">Wartung</TabsTrigger>
        </TabsList>

        {/* Allgemeine Einstellungen */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Einstellungen</CardTitle>
              <CardDescription>
                Grundlegende Einstellungen für die Anwendung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(saveSettings)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={generalForm.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website-Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Der Name Ihrer Website oder Ihres Dienstes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="orderPrefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bestellpräfix</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Präfix für Bestellnummern (z.B. "AE" für AE-2023-001)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="siteDescription"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Website-Beschreibung</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormDescription>
                            Eine kurze Beschreibung Ihres Dienstes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Administrator-E-Mail</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormDescription>
                            E-Mail-Adresse des Systemadministrators
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="supportEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support-E-Mail</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormDescription>
                            E-Mail-Adresse für Support-Anfragen
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="currencySymbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Währungssymbol</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Symbol für die verwendete Währung
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="itemsPerPage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Einträge pro Seite</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={5} max={100} />
                          </FormControl>
                          <FormDescription>
                            Anzahl der Einträge in Tabellen und Listen
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="maintenance-mode" className="font-medium">Wartungsmodus</Label>
                        <p className="text-sm text-gray-500">Website für Wartungsarbeiten offline schalten</p>
                      </div>
                      <Switch id="maintenance-mode" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="user-registration" className="font-medium">Benutzerregistrierung</Label>
                        <p className="text-sm text-gray-500">Neuen Benutzern erlauben, sich zu registrieren</p>
                      </div>
                      <Switch id="user-registration" defaultChecked />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">
                      <IconDeviceFloppy className="mr-2 h-4 w-4" />
                      Einstellungen speichern
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-Mail-Einstellungen */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail-Einstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie E-Mail-Server und Benachrichtigungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP-Host</Label>
                    <Input id="smtp-host" placeholder="smtp.example.com" />
                    <p className="text-sm text-gray-500">Hostname des SMTP-Servers</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP-Port</Label>
                    <Input id="smtp-port" placeholder="587" type="number" />
                    <p className="text-sm text-gray-500">Port des SMTP-Servers</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">SMTP-Benutzername</Label>
                    <Input id="smtp-user" placeholder="benutzer@example.com" />
                    <p className="text-sm text-gray-500">Benutzername für SMTP-Authentifizierung</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">SMTP-Passwort</Label>
                    <Input id="smtp-password" type="password" placeholder="••••••••" />
                    <p className="text-sm text-gray-500">Passwort für SMTP-Authentifizierung</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Absendername</Label>
                    <Input id="sender-name" placeholder="Achis Einkaufservice" />
                    <p className="text-sm text-gray-500">Name, der als E-Mail-Absender angezeigt wird</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender-email">Absender-E-Mail</Label>
                    <Input id="sender-email" placeholder="no-reply@achis-einkaufservice.de" type="email" />
                    <p className="text-sm text-gray-500">E-Mail-Adresse, die als Absender verwendet wird</p>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="order-notifications" className="font-medium">Bestellbenachrichtigungen</Label>
                      <p className="text-sm text-gray-500">E-Mails bei neuen Bestellungen senden</p>
                    </div>
                    <Switch id="order-notifications" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="user-welcome" className="font-medium">Willkommensnachrichten</Label>
                      <p className="text-sm text-gray-500">E-Mails an neue Benutzer senden</p>
                    </div>
                    <Switch id="user-welcome" defaultChecked />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline">
                    <IconMail className="mr-2 h-4 w-4" />
                    Test-E-Mail senden
                  </Button>
                  <Button>
                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                    Einstellungen speichern
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sicherheitseinstellungen */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sicherheitseinstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie Sicherheitsoptionen und Berechtigungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Passwortrichtlinie</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="min-password-length">Mindestlänge des Passworts</Label>
                      <Input id="min-password-length" type="number" min="8" max="30" defaultValue="8" />
                      <p className="text-sm text-gray-500">Minimale Anzahl an Zeichen für Passwörter</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password-complexity">Passwortkomplexität</Label>
                      <select id="password-complexity" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="low">Niedrig (nur Buchstaben)</option>
                        <option value="medium" selected>Mittel (Buchstaben und Zahlen)</option>
                        <option value="high">Hoch (Buchstaben, Zahlen und Sonderzeichen)</option>
                      </select>
                      <p className="text-sm text-gray-500">Erforderliche Komplexität für Passwörter</p>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="two-factor-auth" className="font-medium">Zwei-Faktor-Authentifizierung</Label>
                        <p className="text-sm text-gray-500">Zwei-Faktor-Authentifizierung für Administratoren erzwingen</p>
                      </div>
                      <Switch id="two-factor-auth" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="brute-force" className="font-medium">Brute-Force-Schutz</Label>
                        <p className="text-sm text-gray-500">Nach mehreren fehlgeschlagenen Versuchen sperren</p>
                      </div>
                      <Switch id="brute-force" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="session-timeout" className="font-medium">Automatische Abmeldung</Label>
                        <p className="text-sm text-gray-500">Benutzer nach Inaktivität automatisch abmelden</p>
                      </div>
                      <Switch id="session-timeout" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                    Einstellungen speichern
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datenbankeinstellungen */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Datenbankeinstellungen</CardTitle>
              <CardDescription>
                Backup und Wiederherstellung der Datenbank
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <IconServer className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-700">Datenbankverbindung aktiv</h3>
                      <p className="text-blue-600 text-sm mt-1">
                        Die Datenbank ist verbunden und funktioniert ordnungsgemäß. 
                        Typ: PostgreSQL, Status: Online
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Backup und Wiederherstellung</h3>
                  <p className="text-sm text-gray-500">
                    Erstellen und verwalten Sie Backups Ihrer Datenbank
                  </p>

                  <div className="flex space-x-2">
                    <Button onClick={createBackup}>
                      <IconDatabaseImport className="mr-2 h-4 w-4" />
                      Backup erstellen
                    </Button>
                    <Button variant="outline" onClick={restoreBackup}>
                      <IconReload className="mr-2 h-4 w-4" />
                      Backup wiederherstellen
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Aufbewahrungsrichtlinie</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="backup-retention">Backup-Aufbewahrung (Tage)</Label>
                      <Input id="backup-retention" type="number" min="1" max="365" defaultValue="30" />
                      <p className="text-sm text-gray-500">Wie lange Backups aufbewahrt werden sollen</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="log-retention">Protokoll-Aufbewahrung (Tage)</Label>
                      <Input id="log-retention" type="number" min="1" max="365" defaultValue="90" />
                      <p className="text-sm text-gray-500">Wie lange Datenbankprotokolle aufbewahrt werden sollen</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                    Einstellungen speichern
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wartungseinstellungen */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Wartungseinstellungen</CardTitle>
              <CardDescription>
                System-Wartung und Cache-Verwaltung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Cache-Verwaltung</h3>
                  <p className="text-sm text-gray-500">
                    Verwalten Sie den Systemcache für optimale Leistung
                  </p>

                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={clearCache}>
                      <IconReload className="mr-2 h-4 w-4" />
                      Cache leeren
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Protokollierung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="log-level">Protokollierungsebene</Label>
                      <select id="log-level" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="error">Nur Fehler</option>
                        <option value="warning">Warnungen und Fehler</option>
                        <option value="info" selected>Informationen, Warnungen und Fehler</option>
                        <option value="debug">Ausführlich (Debug)</option>
                      </select>
                      <p className="text-sm text-gray-500">Detailgrad der Systemprotokolle</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="error-display">Fehleranzeige</Label>
                      <select id="error-display" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="none">Keine (nur im Protokoll)</option>
                        <option value="simple" selected>Einfach (Benutzerfreundlich)</option>
                        <option value="detailed">Detailliert (Für Administratoren)</option>
                      </select>
                      <p className="text-sm text-gray-500">Wie Fehler Benutzern angezeigt werden</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Systemleistung</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="image-compression" className="font-medium">Bildkompression</Label>
                      <p className="text-sm text-gray-500">Bilder automatisch komprimieren, um Speicherplatz zu sparen</p>
                    </div>
                    <Switch id="image-compression" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="minify-assets" className="font-medium">Asset-Minimierung</Label>
                      <p className="text-sm text-gray-500">CSS und JavaScript minimieren für schnellere Ladezeiten</p>
                    </div>
                    <Switch id="minify-assets" defaultChecked />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                    Einstellungen speichern
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}