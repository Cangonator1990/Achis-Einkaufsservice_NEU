import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { AddressItem } from "@/components/address-item";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, createUserQueryKey } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Address } from "@shared/schema";

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
  newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein"),
  confirmPassword: z.string().min(1, "Passwort-Bestätigung ist erforderlich"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// Profile schema
const profileSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  phoneNumber: z.string().min(1, "Telefonnummer ist erforderlich"),
});

type ProfileData = z.infer<typeof profileSchema>;

// Address form schema
const addressFormSchema = z.object({
  addresses: z.array(z.object({
    id: z.number().optional(),
    name: z.string().min(1, "Name ist erforderlich"),
    street: z.string().min(1, "Straße ist erforderlich"),
    houseNumber: z.string().min(1, "Hausnummer ist erforderlich"),
    postalCode: z.string().min(5, "PLZ muss mindestens 5 Zeichen lang sein"),
    city: z.string().min(1, "Stadt ist erforderlich"),
    isDefault: z.boolean().optional(),
  })),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

export function ProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");

  // Get user's addresses - mit benutzergebundenem Query-Key
  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery<Address[]>({
    queryKey: createUserQueryKey("/api/addresses", user?.id),
    enabled: !!user,
    staleTime: 0, // Immer als veraltet betrachten und neu laden
    gcTime: 0, // Sofort aus dem Garbage Collector entfernen (früher cacheTime)
  });

  // Setup personal info form
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  // Setup address form
  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      addresses: addresses.length > 0 ? addresses.map(address => ({
        id: address.id,
        name: address.name,
        street: address.street,
        houseNumber: address.houseNumber,
        postalCode: address.postalCode,
        city: address.city,
        isDefault: address.isDefault,
      })) : [{
        name: "",
        street: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        isDefault: true,
      }],
    },
  });

  // Setup password form
  const passwordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Field array for addresses
  const { fields, append, remove } = useFieldArray({
    control: addressForm.control,
    name: "addresses",
  });

  // Update address form when addresses are loaded
  React.useEffect(() => {
    if (addresses.length > 0) {
      addressForm.reset({
        addresses: addresses.map(address => ({
          id: address.id,
          name: address.name,
          street: address.street,
          houseNumber: address.houseNumber,
          postalCode: address.postalCode,
          city: address.city,
          isDefault: address.isDefault,
        })),
      });
    }
  }, [addresses]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const res = await apiRequest("/api/profile", { 
        method: "PATCH",
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil aktualisiert",
        description: "Ihre persönlichen Daten wurden erfolgreich aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/user", user?.id) });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren des Profils",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: Omit<Address, "id" | "userId" | "isDefault">) => {
      const res = await apiRequest("/api/addresses", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Adresse hinzugefügt",
        description: "Die neue Adresse wurde erfolgreich hinzugefügt.",
      });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/addresses", user?.id) });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Hinzufügen der Adresse",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Address> }) => {
      const res = await apiRequest(`/api/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Adresse aktualisiert",
        description: "Die Adresse wurde erfolgreich aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/addresses", user?.id) });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren der Adresse",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete address mutation using the new endpoint
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        console.log(`Beginne Löschanfrage für Adresse ${id} (NEUE METHODE)`);
        
        // Verwende die neue POST-basierte Löschroute statt der DELETE-Route
        const response = await fetch(`/api/addresses/delete`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ addressId: id })
        });
        
        console.log(`Löschanfrage für Adresse ${id}, Status: ${response.status}`);
        
        // Parse die Antwort
        let data;
        try {
          data = await response.json();
          console.log("Empfangene Antwortdaten:", data);
        } catch (parseError) {
          console.error("Fehler beim Parsen der Antwort:", parseError);
          if (response.ok) {
            // Wenn die Antwort erfolgreich war aber kein JSON, ignorieren wir den Parsing-Fehler
            return { success: true };
          }
          throw new Error("Ungültiges Antwortformat vom Server");
        }
        
        if (response.ok) {
          console.log(`Adresse ${id} erfolgreich gelöscht:`, data);
          return { success: true };
        } else {
          console.error(`Fehler beim Löschen der Adresse ${id}:`, data);
          throw new Error(data.message || "Die Adresse konnte nicht gelöscht werden.");
        }
      } catch (error) {
        console.error("Fehler beim Löschen der Adresse:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Adresse gelöscht",
        description: "Die Adresse wurde erfolgreich gelöscht.",
      });
      
      // Stellen Sie sicher, dass alle Adressdaten neu geladen werden
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/addresses", user?.id) });
      console.log("Abfrage für Adressen wurde invalidiert");
    },
    onError: (error: Error) => {
      console.error("Fehlerbehandlung für Adresslöschung:", error.message);
      toast({
        title: "Fehler beim Löschen der Adresse",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default address mutation
  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/addresses/${id}/set-default`, {
        method: "POST"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/addresses", user?.id) });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Festlegen der Standardadresse",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const res = await apiRequest("/api/profile/change-password", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Passwort geändert",
        description: "Ihr Passwort wurde erfolgreich geändert.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Ändern des Passworts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const onProfileSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  // Handle address form submission
  const onAddressSubmit = async (data: AddressFormData) => {
    // Erfasse alle Mutationsoperationen, um sie zu verfolgen
    const updatePromises: Promise<any>[] = [];
    const createPromises: Promise<any>[] = [];
    
    // Für jede Adresse bestimmen, ob sie neu oder aktualisiert werden muss
    data.addresses.forEach(addr => {
      // Wenn sie eine ID hat, ist es eine bestehende Adresse, die aktualisiert werden muss
      if (addr.id) {
        const existingAddr = addresses.find(a => a.id === addr.id);
        if (existingAddr) {
          // Prüfen, ob sich etwas geändert hat
          if (
            existingAddr.name !== addr.name ||
            existingAddr.street !== addr.street ||
            existingAddr.houseNumber !== addr.houseNumber ||
            existingAddr.postalCode !== addr.postalCode ||
            existingAddr.city !== addr.city ||
            existingAddr.isDefault !== addr.isDefault
          ) {
            // Erstelle ein Promise für die Update-Operation
            const updatePromise = new Promise<void>((resolve, reject) => {
              updateAddressMutation.mutate({
                id: addr.id!,
                data: {
                  name: addr.name,
                  street: addr.street,
                  houseNumber: addr.houseNumber,
                  postalCode: addr.postalCode,
                  city: addr.city,
                  isDefault: addr.isDefault,
                }
              }, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
              });
            });
            updatePromises.push(updatePromise);
          }
        }
      } else {
        // Es ist eine neue Adresse
        const createPromise = new Promise<void>((resolve, reject) => {
          createAddressMutation.mutate({
            name: addr.name,
            street: addr.street,
            houseNumber: addr.houseNumber,
            postalCode: addr.postalCode,
            city: addr.city,
            isDefault: !!addr.isDefault,
            userId: user!.id,
          }, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error)
          });
        });
        createPromises.push(createPromise);
      }
    });
    
    // Warte auf den Abschluss aller Update- und Create-Operationen
    try {
      await Promise.all([...updatePromises, ...createPromises]);
      toast({
        title: "Adressen gespeichert",
        description: "Ihre Adressen wurden erfolgreich gespeichert.",
      });
    } catch (error) {
      console.error("Fehler beim Speichern der Adressen:", error);
      // Fehler wurden bereits durch die einzelnen Mutations behandelt
    }
  };

  // Handle password form submission
  const onPasswordSubmit = (data: ChangePasswordData) => {
    changePasswordMutation.mutate(data);
  };

  // Add a new address
  const addAddress = () => {
    append({
      name: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      isDefault: false,
    });
  };

  // Remove an address
  const removeAddress = (index: number) => {
    const addressToRemove = addressForm.getValues().addresses[index];
    console.log(`Versuche Adresse zu entfernen: Index ${index}, Adresse:`, addressToRemove);
    
    if (addressToRemove.id) {
      console.log(`Entferne existierende Adresse mit ID ${addressToRemove.id} vom Backend`);
      // Es ist eine existierende Adresse, lösche sie vom Backend
      deleteAddressMutation.mutate(addressToRemove.id, {
        onSuccess: () => {
          console.log(`Adresse mit ID ${addressToRemove.id} erfolgreich vom Backend gelöscht, entferne sie aus dem Formular`);
          // Entferne das Element aus dem Formular erst nach erfolgreicher Löschung im Backend
          remove(index);
          
          // Aktualisiere die Adressliste, für den Fall, dass wir die Standardadresse gelöscht haben
          queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/addresses", user?.id) });
        },
        onError: (error) => {
          console.error(`Fehler beim Löschen der Adresse mit ID ${addressToRemove.id}:`, error);
          // Bei einem Fehler bleibt die Adresse im Formular erhalten
          toast({
            title: "Fehler beim Löschen der Adresse",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    } else {
      console.log(`Entferne neue Adresse (ohne ID) nur aus dem Formular`);
      // Wenn es keine existierende Adresse ist (keine ID), entferne sie nur aus dem Formular
      remove(index);
    }
  };

  // Set default address
  const setDefaultAddress = (id?: number) => {
    if (id) {
      setDefaultAddressMutation.mutate(id);
    } else {
      // If it's a new address, just update form values
      const addresses = addressForm.getValues().addresses;
      addresses.forEach((addr, i) => {
        addressForm.setValue(`addresses.${i}.isDefault`, false);
      });
      // Set the current one as default
      addressForm.setValue(`addresses.${0}.isDefault`, true);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-800">Mein Profil</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="personal">Persönliche Informationen</TabsTrigger>
            <TabsTrigger value="addresses">Lieferadressen</TabsTrigger>
            <TabsTrigger value="password">Passwort ändern</TabsTrigger>
          </TabsList>
          
          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Vorname</FormLabel>
                    <Input 
                      value={user?.firstName || ""}
                      disabled
                      className="w-full bg-gray-100 border-gray-300 rounded-md shadow-sm h-10 px-3"
                    />
                  </div>
                  
                  <div>
                    <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Nachname</FormLabel>
                    <Input 
                      value={user?.lastName || ""}
                      disabled
                      className="w-full bg-gray-100 border-gray-300 rounded-md shadow-sm h-10 px-3"
                    />
                  </div>
                  
                  <div>
                    <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</FormLabel>
                    <Input 
                      value={user?.birthDate ? new Date(user.birthDate).toLocaleDateString() : ""}
                      disabled
                      className="w-full bg-gray-100 border-gray-300 rounded-md shadow-sm h-10 px-3"
                    />
                  </div>
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">E-Mail</FormLabel>
                        <FormControl>
                          <Input 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
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
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</FormLabel>
                        <FormControl>
                          <Input 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-600 transition-colors"
                  >
                    {updateProfileMutation.isPending ? "Wird gespeichert..." : "Änderungen speichern"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <Form {...addressForm}>
              <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Lieferadressen</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-primary hover:text-primary-600 transition-colors"
                    onClick={addAddress}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adresse hinzufügen
                  </Button>
                </div>
                
                {fields.map((field, index) => (
                  <AddressItem
                    key={field.id}
                    index={index}
                    addressId={field.id ? Number(field.id) : undefined}
                    isDefault={!!field.isDefault}
                    onSetDefault={setDefaultAddress}
                    onRemove={() => removeAddress(index)}
                    disableRemove={fields.length <= 1}
                    register={addressForm.register}
                    errors={addressForm.formState.errors}
                    setValue={addressForm.setValue}
                    getValues={addressForm.getValues}
                  />
                ))}
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={
                      createAddressMutation.isPending || 
                      updateAddressMutation.isPending || 
                      deleteAddressMutation.isPending
                    }
                    className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-600 transition-colors"
                  >
                    {createAddressMutation.isPending || updateAddressMutation.isPending || deleteAddressMutation.isPending 
                      ? "Wird gespeichert..." 
                      : "Adressen speichern"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          {/* Password Tab */}
          <TabsContent value="password">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Aktuelles Passwort</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-600 transition-colors"
                  >
                    {changePasswordMutation.isPending ? "Wird geändert..." : "Passwort ändern"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
