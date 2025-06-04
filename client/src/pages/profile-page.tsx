import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, createUserQueryKey } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/layouts/MainLayout';
import AddressForm from '@/components/AddressForm';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { format, parse } from 'date-fns';
import { Edit, Home, Plus, Trash2, CheckCircle } from 'lucide-react';

// Profile form schema for validation
const profileFormSchema = z.object({
  email: z.string().email({ message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' }),
  phoneNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [editAddress, setEditAddress] = useState<any>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<number | null>(null);
  // State für die Bestellanweisungen
  const [showOrderInstructions, setShowOrderInstructions] = useState<boolean>(user?.showOrderInstructions !== false);

  // Address interface
interface Address {
  id: number;
  userId: number;
  name?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  additionalInfo?: string;
  isDefault: boolean;
}

// Fetch addresses
  const { data: addresses = [], isLoading: addressesLoading } = useQuery<Address[]>({
    queryKey: createUserQueryKey('/api/addresses'),
  });

  // Profile form setup
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  // Format birth date for display
  const formattedBirthDate = user?.birthDate
    ? format(new Date(user.birthDate), 'dd.MM.yyyy')
    : '';

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const res = await apiRequest('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify(values)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profil aktualisiert',
        description: 'Ihre Profildaten wurden erfolgreich aktualisiert.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey('/api/user') });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Profil konnte nicht aktualisiert werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: number) => {
      // Korrekt formatierter API-Request mit POST-Methode und JSON-Body
      const res = await apiRequest(`/api/addresses/delete`, {
        method: 'POST',
        body: JSON.stringify({ addressId }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Adresse gelöscht',
        description: 'Die Adresse wurde erfolgreich gelöscht.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey('/api/addresses') });
      setDeleteAddressId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Adresse konnte nicht gelöscht werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Set default address mutation
  const setDefaultAddressMutation = useMutation({
    mutationFn: async (addressId: number) => {
      // Korrekte apiRequest Syntax
      const res = await apiRequest(`/api/addresses/${addressId}/default`, {
        method: 'PATCH'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Standardadresse festgelegt',
        description: 'Die Standardadresse wurde erfolgreich aktualisiert.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey('/api/addresses') });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Standardadresse konnte nicht festgelegt werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Toggle Show Order Instructions mutation
  const toggleOrderInstructionsMutation = useMutation({
    mutationFn: async (showInstructions: boolean) => {
      const res = await apiRequest('/api/preferences/orderInstructions', {
        method: 'PATCH',
        body: JSON.stringify({ show: showInstructions })
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Sofortiges Aktualisieren der Benutzerdaten im Cache
      if (user) {
        queryClient.setQueryData(createUserQueryKey('/api/user'), {
          ...user,
          showOrderInstructions: data.showOrderInstructions
        });
      }
      
      // Sicherstellen, dass alle Komponenten, die Benutzer-Daten verwenden, aktualisiert werden
      queryClient.invalidateQueries({ queryKey: createUserQueryKey('/api/user') });
      
      toast({
        title: 'Einstellung gespeichert',
        description: 'Ihre Bestellanweisungen-Einstellung wurde aktualisiert.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Einstellung konnte nicht aktualisiert werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Submit profile form
  const onSubmitProfile = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };
  
  // Toggle Order Instructions
  const handleToggleOrderInstructions = (value: boolean) => {
    setShowOrderInstructions(value);
    toggleOrderInstructionsMutation.mutate(value);
  };

  // Handle address actions
  const handleEditAddress = (address: any) => {
    setEditAddress(address);
  };

  const handleDeleteAddress = (addressId: number) => {
    setDeleteAddressId(addressId);
  };

  const confirmDeleteAddress = () => {
    if (deleteAddressId) {
      deleteAddressMutation.mutate(deleteAddressId);
    }
  };

  const handleSetDefaultAddress = (addressId: number) => {
    setDefaultAddressMutation.mutate(addressId);
  };

  return (
    <MainLayout>
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8 font-sans">Mein Profil</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {user && (
                          <span className="text-4xl text-gray-500">
                            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="absolute bottom-0 right-0 rounded-full"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center mb-6">
                    <CardTitle>
                      {user?.firstName} {user?.lastName}
                    </CardTitle>
                    <CardDescription>
                      Kunde
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                      <div>
                        <FormItem>
                          <FormLabel>Vorname</FormLabel>
                          <Input 
                            value={user?.firstName || ''} 
                            disabled 
                            className="bg-gray-100"
                          />
                        </FormItem>
                      </div>
                      
                      <div>
                        <FormItem>
                          <FormLabel>Nachname</FormLabel>
                          <Input 
                            value={user?.lastName || ''} 
                            disabled 
                            className="bg-gray-100"
                          />
                        </FormItem>
                      </div>
                      
                      <div>
                        <FormItem>
                          <FormLabel>Geburtsdatum</FormLabel>
                          <Input 
                            value={formattedBirthDate} 
                            disabled 
                            className="bg-gray-100"
                          />
                        </FormItem>
                      </div>
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Mail</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefonnummer</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-4"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending 
                          ? 'Wird gespeichert...' 
                          : 'Änderungen speichern'
                        }
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - Addresses */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Meine Adressen</CardTitle>
                    <Button 
                      onClick={() => {
                        setEditAddress(null);
                        setShowAddAddressForm(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Neue Adresse
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {addressesLoading ? (
                    <div className="text-center py-6 text-gray-500">
                      Laden...
                    </div>
                  ) : Array.isArray(addresses) && addresses.length === 0 ? (
                    <Alert>
                      <Home className="h-4 w-4" />
                      <AlertTitle>Keine Adressen vorhanden</AlertTitle>
                      <AlertDescription>
                        Sie haben noch keine Lieferadressen hinzugefügt. Fügen Sie Ihre erste Adresse hinzu, um Bestellungen aufgeben zu können.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {Array.isArray(addresses) && addresses.map((address) => (
                        <div 
                          key={address.id} 
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center mb-2">
                                <h3 className="font-medium">
                                  {address.name || `${address.street} ${address.houseNumber}`}
                                </h3>
                                {address.isDefault && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full">
                                    Standard
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm">{address.street} {address.houseNumber}</p>
                              <p className="text-gray-600 text-sm">{address.postalCode} {address.city}</p>
                              {address.additionalInfo && (
                                <p className="text-gray-500 text-sm mt-1">{address.additionalInfo}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              {!address.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  title="Als Standard festlegen"
                                >
                                  <CheckCircle className="h-4 w-4 text-gray-500 hover:text-primary" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditAddress(address)}
                                title="Adresse bearbeiten"
                              >
                                <Edit className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAddress(address.id)}
                                title="Adresse löschen"
                              >
                                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Einstellungen Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Einstellungen</CardTitle>
                  <CardDescription>
                    Passen Sie Ihre Nutzererfahrung an
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between space-y-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="orderInstructions">Bestellanweisungen anzeigen</Label>
                      <p className="text-sm text-muted-foreground">
                        Zeigt Hinweise zur Bestellfunktion auf der Bestellseite an
                      </p>
                    </div>
                    <Switch
                      id="orderInstructions"
                      checked={showOrderInstructions}
                      onCheckedChange={handleToggleOrderInstructions}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Add Address Form Dialog */}
              <Dialog open={showAddAddressForm} onOpenChange={setShowAddAddressForm}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Neue Adresse hinzufügen</DialogTitle>
                    <DialogDescription>
                      Fügen Sie eine neue Lieferadresse zu Ihrem Profil hinzu.
                    </DialogDescription>
                  </DialogHeader>
                  <AddressForm 
                    onSuccess={() => setShowAddAddressForm(false)}
                    onCancel={() => setShowAddAddressForm(false)}
                  />
                </DialogContent>
              </Dialog>
              
              {/* Edit Address Form Dialog */}
              <Dialog 
                open={editAddress !== null} 
                onOpenChange={(open) => {
                  if (!open) setEditAddress(null);
                }}
              >
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Adresse bearbeiten</DialogTitle>
                    <DialogDescription>
                      Bearbeiten Sie Ihre Lieferadresse.
                    </DialogDescription>
                  </DialogHeader>
                  {editAddress && (
                    <AddressForm 
                      editAddress={editAddress}
                      onSuccess={() => setEditAddress(null)}
                      onCancel={() => setEditAddress(null)}
                    />
                  )}
                </DialogContent>
              </Dialog>
              
              {/* Delete Address Confirmation Dialog */}
              <Dialog 
                open={deleteAddressId !== null} 
                onOpenChange={(open) => {
                  if (!open) setDeleteAddressId(null);
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adresse löschen</DialogTitle>
                    <DialogDescription>
                      Sind Sie sicher, dass Sie diese Adresse löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteAddressId(null)}
                      disabled={deleteAddressMutation.isPending}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmDeleteAddress}
                      disabled={deleteAddressMutation.isPending}
                    >
                      {deleteAddressMutation.isPending ? 'Wird gelöscht...' : 'Löschen'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default ProfilePage;
