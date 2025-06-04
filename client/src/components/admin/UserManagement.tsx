import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { IconUsers, IconUser, IconDotsVertical, IconLock, IconEye, IconEdit, IconTrash, IconX, IconCheck, IconSearch } from '@tabler/icons-react';

export function UserManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('all');

  // Alle Benutzer abrufen
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      console.log("Fetching admin users");
      const response = await apiRequest('/api/admin/users');
      return response.json();
    }
  });

  // Benutzer aktivieren/deaktivieren
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number, isActive: boolean }) => {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzerstatus aktualisiert',
        description: 'Der Benutzerstatus wurde erfolgreich aktualisiert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Benutzerstatus konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  });

  // Benutzer löschen
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzer gelöscht',
        description: 'Der Benutzer wurde erfolgreich gelöscht.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Benutzer konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  });

  // Benutzer zum Administrator befördern
  const promoteToAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(`/api/admin/users/${userId}/promote`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzer befördert',
        description: 'Der Benutzer wurde erfolgreich zum Administrator befördert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Benutzer konnte nicht befördert werden.',
        variant: 'destructive',
      });
    }
  });

  // Benutzerliste filtern
  const filteredUsers = users.filter((user: any) => {
    // Suche
    const matchesSearch = searchQuery === '' ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab-Filter
    if (currentTab === 'all') return matchesSearch;
    if (currentTab === 'active') return matchesSearch && user.isActive;
    if (currentTab === 'inactive') return matchesSearch && !user.isActive;
    if (currentTab === 'admin') return matchesSearch && user.role === 'admin';

    return matchesSearch;
  });

  // Benutzerdetails anzeigen
  const showUserDetails = (user: any) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  // Benutzer aktivieren/deaktivieren
  const toggleUserStatus = (userId: number, isActive: boolean) => {
    toggleUserStatusMutation.mutate({ userId, isActive });
  };

  // Benutzer löschen
  const deleteUser = (userId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Benutzer zum Administrator befördern
  const promoteToAdmin = (userId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Benutzer zum Administrator befördern möchten? Dies gibt dem Benutzer vollen Zugriff auf alle Administratorfunktionen.')) {
      promoteToAdminMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Benutzerverwaltung</h2>
        <Button>
          <IconUser className="mr-2 h-5 w-5" />
          Neuen Benutzer erstellen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benutzerliste</CardTitle>
          <CardDescription>Verwalten Sie die Benutzer Ihres Systems.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              </div>
              <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
                <TabsList>
                  <TabsTrigger value="all">Alle</TabsTrigger>
                  <TabsTrigger value="active">Aktiv</TabsTrigger>
                  <TabsTrigger value="inactive">Inaktiv</TabsTrigger>
                  <TabsTrigger value="admin">Administratoren</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="animate-pulse flex items-center space-x-4 p-4 border-b">
                    <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registriert am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">Keine Benutzer gefunden</TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-xs text-gray-500">@{user.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                              {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'destructive'}>
                              {user.isActive ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <IconDotsVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => showUserDetails(user)}>
                                  <IconEye className="mr-2 h-4 w-4" />
                                  Details anzeigen
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <IconEdit className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </DropdownMenuItem>
                                {user.isActive ? (
                                  <DropdownMenuItem onClick={() => toggleUserStatus(user.id, false)}>
                                    <IconX className="mr-2 h-4 w-4" />
                                    Deaktivieren
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => toggleUserStatus(user.id, true)}>
                                    <IconCheck className="mr-2 h-4 w-4" />
                                    Aktivieren
                                  </DropdownMenuItem>
                                )}
                                {user.role !== 'admin' && (
                                  <DropdownMenuItem onClick={() => promoteToAdmin(user.id)}>
                                    <IconLock className="mr-2 h-4 w-4" />
                                    Zum Admin befördern
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteUser(user.id)}>
                                  <IconTrash className="mr-2 h-4 w-4" />
                                  Löschen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <div className="text-sm text-gray-500">
            {filteredUsers.length} Benutzer angezeigt
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Zurück
            </Button>
            <Button variant="outline" size="sm" disabled>
              Weiter
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Benutzerdetails Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Benutzerdetails</DialogTitle>
            <DialogDescription>
              Detaillierte Informationen über den ausgewählten Benutzer.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Benutzername</h3>
                  <p>{selectedUser.username}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p>{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">E-Mail</h3>
                  <p>{selectedUser.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Telefonnummer</h3>
                  <p>{selectedUser.phoneNumber || '-'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Rolle</h3>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'outline'}>
                    {selectedUser.role === 'admin' ? 'Administrator' : 'Benutzer'}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <Badge variant={selectedUser.isActive ? 'default' : 'destructive'}>
                    {selectedUser.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Registrierungsdatum</h3>
                  <p>{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Letzte Anmeldung</h3>
                  <p>{new Date(selectedUser.lastLoginAt || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Schließen
            </Button>
            <Button>
              <IconEdit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Die benutzerdefinierte IconSearch-Funktion wurde entfernt, weil wir jetzt das Icon aus @tabler/icons-react importieren